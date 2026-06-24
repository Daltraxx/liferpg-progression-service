# Commit Progression Function

-- Function to commit user progression updates to the database in a transaction
-- Takes processed progression data for a user and the activity date for which the progression is being committed
-- This function is intended to be called for each user during the daily settlement batch job after calculations have been performed based on the data retrieved from get_settlement_users_data. It will handle all necessary updates to the users, quests, attributes, and progression_logs tables in a single transaction to ensure data integrity. The function also includes validation of the input data and error handling to catch any issues during the update process.
-- Safe to call multiple times for the same user and activity date due to the unique constraint on daily_progression_batches, which prevents duplicate processing and allows for idempotent retries in case of failures.
-- Service role permissions are required to execute this function and its helper function due to the need for updating multiple tables and ensuring proper access control.

```sql
-- Define a function to commit user progression updates to the database in a transaction
CREATE OR REPLACE FUNCTION public.commit_progression(p_processed_progression_data JSONB, p_activity_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_progression_record JSONB;
BEGIN
    -- Validate input data
    IF jsonb_typeof(p_processed_progression_data) <> 'array' THEN
        RAISE EXCEPTION 'Expected an array for p_processed_progression_data';
    END IF;
    IF p_activity_date IS NULL THEN
        RAISE EXCEPTION 'p_activity_date cannot be null';
    END IF;

    -- Loop through each processed progression data object and perform database updates in a transaction
    FOR v_progression_record IN SELECT value FROM jsonb_array_elements(p_processed_progression_data)
    LOOP
        PERFORM public.update_progression(v_progression_record, p_activity_date);
    END LOOP;
END;
$$;

-- Define a helper function to perform the actual database updates for a single user's progression
CREATE OR REPLACE FUNCTION public.update_progression(p_user_progression JSONB, p_activity_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := (p_user_progression->>'userId')::UUID;
    v_user_experience INTEGER := (p_user_progression->>'experience')::INTEGER;
    v_user_level INTEGER := (p_user_progression->>'level')::INTEGER;
    v_processed_at TIMESTAMPTZ := (p_user_progression->>'processedAt')::TIMESTAMPTZ;
    v_timezone TEXT := (p_user_progression->>'timezone')::TEXT;
    v_daily_batch_id INTEGER;
BEGIN
    -- Validate input data
        IF v_user_id IS NULL
        OR v_user_experience IS NULL
        OR v_user_level IS NULL
        OR v_processed_at IS NULL
        OR v_timezone IS NULL THEN
        RAISE EXCEPTION 'Missing required progression field';
    END IF;

     -- Insert a record into daily_progression_batches and get the generated batch ID for progression logs
    INSERT INTO daily_progression_batches (user_id, processed_at, activity_date, user_timezone)
    VALUES (v_user_id, v_processed_at, p_activity_date, v_timezone)
    ON CONFLICT (user_id, activity_date) DO NOTHING
    RETURNING id INTO v_daily_batch_id;

    IF v_daily_batch_id IS NULL THEN
        -- Already processed. Exit safely.
        RETURN;
    END IF;

    -- Update the user's overall experience and level in the users table
    DECLARE
        v_rows_updated INTEGER;
    BEGIN
        UPDATE users
        SET
            experience = v_user_experience,
            level = v_user_level,
            updated_at = NOW()
        WHERE id = v_user_id;

        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        IF v_rows_updated <> 1 THEN
            RAISE EXCEPTION 'Expected to update 1 user, updated % for user %', v_rows_updated, v_user_id;
        END IF;
    END;

    -- Bulk update quests based on the quest updates in the progression data
    DECLARE
        v_expected_quest_updates INTEGER;
        v_actual_quest_updates INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_expected_quest_updates
        FROM jsonb_to_recordset(coalesce(p_user_progression->'quests', '[]'::jsonb)) AS q(
            "questId" INTEGER,
            "strengthLevel" strength_rank,
            "strengthPoints" INTEGER,
            "restProgress" INTEGER,
            "streak" INTEGER,
            "lastCompletedDate" DATE
        );

        WITH quest_updates AS (
            SELECT *
            FROM jsonb_to_recordset(coalesce(p_user_progression->'quests', '[]'::jsonb)) AS q(
                "questId" INTEGER,
                "strengthLevel" strength_rank,
                "strengthPoints" INTEGER,
                "restProgress" INTEGER,
                "streak" INTEGER,
                "lastCompletedDate" DATE
            )
        )
        UPDATE quests q
        SET
            strength_level = qu."strengthLevel",
            strength_points = qu."strengthPoints",
            rest_progress = qu."restProgress",
            streak = qu."streak",
            last_completed_date = qu."lastCompletedDate",
            updated_at = NOW()
        FROM quest_updates qu
        WHERE q.user_id = v_user_id AND q.id = qu."questId";

        GET DIAGNOSTICS v_actual_quest_updates = ROW_COUNT;
        IF v_actual_quest_updates <> v_expected_quest_updates THEN
            RAISE EXCEPTION 'Expected to update % quests, but updated % for user %', v_expected_quest_updates, v_actual_quest_updates, v_user_id;
        END IF;
    END;

    -- Bulk update attributes based on the attribute updates in the progression data
    DECLARE
        v_expected_attribute_updates INTEGER;
        v_actual_attribute_updates INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_expected_attribute_updates
        FROM jsonb_to_recordset(coalesce(p_user_progression->'attributes', '[]'::jsonb)) AS a(
            "attributeId" INTEGER,
            "level" INTEGER,
            "experience" INTEGER
        );

        WITH attribute_updates AS (
        SELECT *
        FROM jsonb_to_recordset(coalesce(p_user_progression->'attributes', '[]'::jsonb)) AS a(
            "attributeId" INTEGER,
            "level" INTEGER,
            "experience" INTEGER
        )
    )
        UPDATE attributes a
        SET
            level = au."level",
            experience = au."experience",
            updated_at = NOW()
        FROM attribute_updates au
        WHERE a.user_id = v_user_id AND a.id = au."attributeId";

        GET DIAGNOSTICS v_actual_attribute_updates = ROW_COUNT;
        IF v_actual_attribute_updates <> v_expected_attribute_updates THEN
            RAISE EXCEPTION 'Expected to update % attributes, but updated % for user %', v_expected_attribute_updates, v_actual_attribute_updates, v_user_id;
        END IF;
    END;

    -- Insert progression logs based on the progressionLogs array in the progression data
    DECLARE
        v_expected_log_inserts INTEGER;
        v_actual_log_inserts INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_expected_log_inserts
        FROM jsonb_to_recordset(coalesce(p_user_progression->'progressionLogs', '[]'::jsonb)) AS l(
            "target" TEXT,
            "questId" INTEGER,
            "questName" TEXT,
            "attributeId" INTEGER,
            "attributeName" TEXT,
            "points" INTEGER,
            "reason" TEXT
        );

        INSERT INTO progression_logs (
            daily_batch_id,
            user_id,
            target,
            quest_id,
            quest_name,
            attribute_id,
            attribute_name,
            points,
            reason,
            created_at
        )
        SELECT
            v_daily_batch_id,
            v_user_id,
            l."target",
            l."questId",
            l."questName",
            l."attributeId",
            l."attributeName",
            l."points",
            l."reason",
            NOW()
        FROM jsonb_to_recordset(coalesce(p_user_progression->'progressionLogs', '[]'::jsonb)) AS l(
            "target" TEXT,
            "questId" INTEGER,
            "questName" TEXT,
            "attributeId" INTEGER,
            "attributeName" TEXT,
            "points" INTEGER,
            "reason" TEXT
        );

        GET DIAGNOSTICS v_actual_log_inserts = ROW_COUNT;
        IF v_actual_log_inserts <> v_expected_log_inserts THEN
            RAISE EXCEPTION 'Expected to insert % progression logs, but inserted % for user %', v_expected_log_inserts, v_actual_log_inserts, v_user_id;
        END IF;
    END;

    -- Update the processed_at timestamp for the user's quest completion in the quest_completions table
    DECLARE
        v_expected_completions_updated INTEGER;
        v_actual_completions_updated INTEGER;
    BEGIN
        SELECT COUNT(DISTINCT value::int)
        INTO v_expected_completions_updated
        FROM jsonb_array_elements_text(coalesce(p_user_progression->'processedQuestCompletionIds', '[]'::jsonb));

        WITH completion_ids AS (
            SELECT DISTINCT value::int AS id
            FROM jsonb_array_elements_text(coalesce(p_user_progression->'processedQuestCompletionIds', '[]'::jsonb))
        )
        UPDATE quest_completions qc
        SET
            processed_at = v_processed_at,
            updated_at = NOW()
        FROM completion_ids
        WHERE qc.user_id = v_user_id
            AND qc.processed_at IS NULL
            AND qc.id = completion_ids.id;

        GET DIAGNOSTICS v_actual_completions_updated = ROW_COUNT;
        IF v_actual_completions_updated <> v_expected_completions_updated THEN
            RAISE EXCEPTION 'Expected to update % quest completions, but updated % for user %', v_expected_completions_updated, v_actual_completions_updated, v_user_id;
        END IF;
    END;
END;
$$;
```