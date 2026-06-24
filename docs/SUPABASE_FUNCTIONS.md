# Functions and Triggers Reference

## Handle New User Signup (Trigger)

-- This trigger function listens for new user insertions into the auth.users table (handled by Supabase authentication)
-- and creates a corresponding record in our application-specific users table.
-- It extracts the email, username, and usertag from the raw_user_meta_data JSON field provided by Supabase during signup.
-- This ensures that every authenticated user has a corresponding profile in our users table,
-- which is necessary for linking quests, attributes, and progression data.
-- Note that metadata fields must be validated before insertion, as the trigger assumes they are correctly formatted if present.

```sql
-- Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS
$$
DECLARE
  v_username TEXT := NEW.raw_user_meta_data ->> 'username';
  v_usertag TEXT := NEW.raw_user_meta_data ->> 'usertag';
  v_timezone TEXT := NEW.raw_user_meta_data ->> 'timezone';
BEGIN
  IF v_username IS NULL OR btrim(v_username) = '' THEN
    RAISE EXCEPTION 'Signup metadata missing required field: username';
  END IF;

  IF v_usertag IS NULL OR btrim(v_usertag) = '' THEN
    RAISE EXCEPTION 'Signup metadata missing required field: usertag';
  END IF;

  IF v_timezone IS NULL OR btrim(v_timezone) = '' THEN
    RAISE EXCEPTION 'Signup metadata missing required field: timezone';
  END IF;

  INSERT INTO public.users (id, email, username, usertag, timezone)
  VALUES (NEW.id, NEW.email, v_username, v_usertag, v_timezone);
  RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger
CREATE TRIGGER after_user_signup_create_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
```

## Atomic Profile Creation Function

### Example Call

```typescript
// Prepare data for insertion
const attributesData: CreateProfileTransactionAttributes[] =
  validatedAttributes.map((attribute) => ({
    name: attribute.name,
    position: attribute.order,
  }));

const questsData: CreateProfileTransactionQuests[] = [];
const questsAttributesData: CreateProfileTransactionQuestsAttributes[] = [];
for (const quest of validatedQuests) {
  questsData.push({
    name: quest.name,
    experience_share: quest.experienceShare,
    position: quest.order,
  });
  for (const affectedAttribute of quest.affectedAttributes) {
    const attributePower = strengthToIntMap[affectedAttribute.strength];
    if (attributePower === undefined) {
      return {
        message: `Invalid strength value: ${affectedAttribute.strength}`,
      };
    }
    // Duplicate names are restricted by DB constraints and validation schema
    questsAttributesData.push({
      quest_name: quest.name,
      attribute_name: affectedAttribute.name,
      attribute_power: attributePower,
    });
  }
}

// Insert data into the database within a transaction
const { error } = await supabase.rpc("create_profile_transaction", {
  p_user_id: validatedUserId,
  p_attributes: attributesData,
  p_quests: questsData,
  p_quests_attributes: questsAttributesData,
});
```

---

## Create Profile Transaction Function

-- Defines function that takes user_id, array of attribute objects,
-- array of quest objects, and array of quests_attributes
-- for insertion into respective tables in single atomic transaction.
-- Conflicting names or positions should be handled before calling this function.
-- Existing records should not be an issue (this is intended for new users),
-- but is handled just in case.
-- Descriptions are not handled here but can be added once their support is added.
-- Uses SECURITY DEFINER to ensure proper permissioning.

```sql
CREATE OR REPLACE FUNCTION create_profile_transaction(
  p_user_id UUID,
  p_attributes JSONB,
  p_quests JSONB,
  p_quests_attributes JSONB
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY CHECK: Ensure the authenticated user can only modify their own data
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: User ID mismatch' USING ERRCODE = '42501';
  END IF;

  -- Validate inputs are not NULL
  IF p_attributes IS NULL OR p_quests IS NULL OR p_quests_attributes IS NULL THEN
    RAISE EXCEPTION 'Input parameters cannot be NULL';
  END IF;

  WITH
  -- Parse and deduplicate attribute inputs
  attr_input AS (
    SELECT DISTINCT name, position
    FROM jsonb_to_recordset(p_attributes) AS x(name text, position int)
  ),

  -- Insert attributes and handle existing ones
  inserted_attrs AS (
    INSERT INTO attributes (user_id, name, position)
    SELECT p_user_id, name, position FROM attr_input
    ON CONFLICT (user_id, name) DO UPDATE SET position = EXCLUDED.position
    RETURNING id, name
  ),

  -- Parse and deduplicate quest inputs
  quest_input AS (
    SELECT DISTINCT name, experience_share, position
    FROM jsonb_to_recordset(p_quests) AS x(name text, experience_share int, position int)
  ),

  -- Insert quests and handle existing ones
  inserted_quests AS (
    INSERT INTO quests (user_id, name, experience_share, position)
    SELECT p_user_id, name, experience_share, position FROM quest_input
    ON CONFLICT (user_id, name) DO UPDATE SET position = EXCLUDED.position
    RETURNING id, name
  ),

  -- Final insert into junction table using results from above CTEs
  final_insert AS (
    INSERT INTO quests_attributes (user_id, quest_id, attribute_id, attribute_power)
    SELECT
      p_user_id,
      iq.id,
      ia.id,
      qa.attribute_power
    FROM jsonb_to_recordset(p_quests_attributes) AS qa(quest_name text, attribute_name text, attribute_power int)
    JOIN inserted_quests iq ON qa.quest_name = iq.name
    JOIN inserted_attrs ia ON qa.attribute_name = ia.name
    ON CONFLICT (quest_id, attribute_id) DO UPDATE SET attribute_power = EXCLUDED.attribute_power
    RETURNING quest_id
  ),

  -- Mark profile as complete
  update_profile AS (
    UPDATE users
    SET profile_complete = TRUE, updated_at = NOW()
    WHERE id = p_user_id
    RETURNING id
  )

  -- Build the response with the newly created IDs
  SELECT jsonb_build_object(
    'success', true,
    'attribute_ids', (SELECT jsonb_agg(id) FROM inserted_attrs),
    'quest_ids', (SELECT jsonb_agg(id) FROM inserted_quests),
    'junction_records_inserted', (SELECT count(*) FROM final_insert),
    'profile_marked_complete', (SELECT count(*) > 0 FROM update_profile)
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with a custom message while preserving the internal SQLSTATE
    RAISE EXCEPTION 'Transaction failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;
```

---

### Get Settlement Data Function

-- Function to fetch all necessary data for settlement pipeline in a single call
-- Takes array of timezone strings to filter users for batch processing and optimize data retrieval
-- Returns JSON with users, quests, attributes, quests_attributes, and quest_completions for relevant users
-- This function is intended to reduce the number of round trips between the application and database during the daily settlement batch job, improving performance and efficiency. By filtering users based on timezone, we can ensure that we are only retrieving data for users who are due for settlement processing, which is determined by their local date and time. This function should be called at the beginning of the batch job to gather all necessary data before performing calculations and updates.

```sql
create or replace function public.get_settlement_users_data(
  p_timezones text[]
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(user_data), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'user', jsonb_build_object(
        'id', u.id,
        'experience', u.experience,
        'level', u.level,
        'timezone', u.timezone
      ),

      'quests', coalesce(q.quests, '[]'::jsonb),
      'attributes', coalesce(a.attributes, '[]'::jsonb),
      'quests_attributes', coalesce(qa.quests_attributes, '[]'::jsonb),
      'quest_completions', coalesce(qc.quest_completions, '[]'::jsonb)
    ) as user_data
    from users u

    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'name', q.name,
          'strength_level', q.strength_level,
          'strength_points', q.strength_points,
          'frequency', q.frequency,
          'rest_frequency', q.rest_frequency,
          'rest_progress', q.rest_progress,
          'streak', q.streak,
          'last_completed_date', q.last_completed_date
        )
      ) as quests
      from quests q
      where q.user_id = u.id
    ) q on true

    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'experience', a.experience,
          'level', a.level
        )
      ) as attributes
      from attributes a
      where a.user_id = u.id
    ) a on true

    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'quest_id', qa.quest_id,
          'attribute_id', qa.attribute_id,
          'attribute_power', qa.attribute_power
        )
      ) as quests_attributes
      from quests_attributes qa
      where qa.user_id = u.id
    ) qa on true

    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', qc.id,
          'quest_id', qc.quest_id,
          'experience_earned', qc.experience_earned,
          'processed_at', qc.processed_at,
          'completed_at', qc.completed_at
        )
      ) as quest_completions
      from quest_completions qc
      where qc.user_id = u.id
        and qc.processed_at is null
    ) qc on true

    where u.timezone = any(p_timezones)
      and u.profile_complete = true
  ) user_data;
$$;
```

---

## Commit Progression Function

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

## Edit Profile Transaction Function

-- This function performs the entire profile update process within a single transaction.
-- It takes the user ID and arrays of quests, attributes, and quest-attribute relationships to be inserted, updated, or deleted.
-- It uses a map of client keys to new IDs for quests and attributes to handle the insertion of new records
-- and the creation of relationships in the quests_attributes table when there is not a pre-existing attribute or quest ID.
-- The function ensures that all operations are performed atomically, so if any part of the process fails, the entire transaction will be rolled back to maintain data integrity.
-- The function also includes security checks to ensure that users can only modify their own profiles, and it validates the input data to prevent issues during the update process.
-- TODO: Make all parameters required and remove defaults, as this function should be called with all necessary data for a complete profile update.

```sql
CREATE OR REPLACE FUNCTION public.edit_profile_transaction(
    p_user_id UUID,
    p_quests_inserts JSONB DEFAULT '[]'::JSONB,
    p_quests_updates JSONB DEFAULT '[]'::JSONB,
    p_quests_deletes JSONB DEFAULT '[]'::JSONB,
    p_attributes_inserts JSONB DEFAULT '[]'::JSONB,
    p_attributes_updates JSONB DEFAULT '[]'::JSONB,
    p_attributes_deletes JSONB DEFAULT '[]'::JSONB,
    p_quests_attributes_inserts JSONB DEFAULT '[]'::JSONB,
    p_quests_attributes_updates JSONB DEFAULT '[]'::JSONB,
    p_quests_attributes_deletes JSONB DEFAULT '[]'::JSONB
)

RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_q RECORD;
    v_a RECORD;
    v_qa RECORD;

    v_new_id INT;
    v_resolved_quest_id INT;
    v_resolved_attribute_id INT;

    v_quest_id_map JSONB := '{}'::JSONB; -- Map of client keys to new quest IDs
    v_attribute_id_map JSONB := '{}'::JSONB; -- Map of client keys to new attribute IDs

    v_result JSONB;
BEGIN
    -- SECURITY CHECK: Ensure the authenticated user can only modify their own data
    IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: User ID mismatch'
        USING ERRCODE = '42501';
    END IF;

    -- Validate inputs are not NULL
    IF p_quests_inserts IS NULL OR p_quests_updates IS NULL OR
    p_attributes_inserts IS NULL OR p_attributes_updates IS NULL OR
    p_quests_attributes_inserts IS NULL OR p_quests_attributes_updates IS NULL OR
    p_quests_deletes IS NULL OR p_attributes_deletes IS NULL OR p_quests_attributes_deletes IS NULL THEN
      RAISE EXCEPTION 'Input parameters cannot be NULL';
    END IF;

    -- Lock the user row to prevent concurrent modifications and ensure the user exists
    PERFORM 1
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE; -- Lock the user row to prevent concurrent modifications

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User not found'
        USING ERRCODE = 'P0002';
    END IF;

    -- Defer unique constraint checks to allow for reordering and updates within the transaction
    SET CONSTRAINTS uq_quests_user_id_position DEFERRED;
    SET CONSTRAINTS uq_attributes_user_id_position DEFERRED;

    -- 1. Delete targeted quest-attribute relationships first to avoid foreign key conflicts
    FOR v_qa IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_quests_attributes_deletes, '[]'::JSONB))
        AS x(id INT)
    LOOP
        DELETE FROM public.quests_attributes
        WHERE id = v_qa.id
        AND user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Quest-attribute relationship % not found for user %',
            v_qa.id, p_user_id;
        END IF;
    END LOOP;

    -- 2. Delete quests. This cascades to quests_attributes due to the foreign key constraint.
    FOR v_q IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_quests_deletes, '[]'::JSONB))
        AS x(id INT)
    LOOP
        DELETE FROM public.quests
        WHERE id = v_q.id
        AND user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Quest % not found for user %',
            v_q.id, p_user_id;
        END IF;
    END LOOP;

    -- 3. Delete attributes. This cascades to quests_attributes due to the foreign key constraint.
    FOR v_a IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_attributes_deletes, '[]'::JSONB))
        AS x(id INT)
    LOOP
        DELETE FROM public.attributes
        WHERE id = v_a.id
        AND user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Attribute % not found for user %',
            v_a.id, p_user_id;
        END IF;
    END LOOP;

    -- 4. Update existing quests
    FOR v_q IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_quests_updates, '[]'::JSONB))
        AS x(
          id INT, name TEXT, description TEXT, experience_share INT, frequency INT,
          rest_frequency INT, position INT
        )
    LOOP
        UPDATE public.quests
        SET name = v_q.name,
            description = v_q.description,
            experience_share = v_q.experience_share,
            frequency = v_q.frequency,
            rest_frequency = v_q.rest_frequency,
            position = v_q.position,
            updated_at = NOW()
        WHERE id = v_q.id
        AND user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Quest % not found for user %',
            v_q.id, p_user_id;
        END IF;
    END LOOP;

    -- 5. Insert new quests and build the quest ID map
    FOR v_q IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_quests_inserts, '[]'::JSONB))
        AS x(
          client_key TEXT, name TEXT, description TEXT, experience_share INT, frequency INT,
          rest_frequency INT, position INT
        )
    LOOP
        INSERT INTO public.quests (
          user_id, name, description, experience_share, frequency, rest_frequency, position
        ) VALUES (
          p_user_id, v_q.name, v_q.description, v_q.experience_share, v_q.frequency, v_q.rest_frequency, v_q.position
        )
        RETURNING id INTO v_new_id;

        -- Update the quest ID map with the new ID
        v_quest_id_map := v_quest_id_map || jsonb_build_object(v_q.client_key, v_new_id);
    END LOOP;

    -- 6. Update existing attributes
    FOR v_a IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_attributes_updates, '[]'::JSONB))
        AS x(id INT, name TEXT, position INT)
    LOOP
        UPDATE public.attributes
        SET name = v_a.name,
            position = v_a.position,
            updated_at = NOW()
        WHERE id = v_a.id
        AND user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Attribute % not found for user %',
            v_a.id, p_user_id;
        END IF;
    END LOOP;

    -- 7. Insert new attributes and build the attribute ID map
    FOR v_a IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_attributes_inserts, '[]'::JSONB))
        AS x(client_key TEXT, name TEXT, position INT)
    LOOP
        INSERT INTO public.attributes (
          user_id, name, position
        ) VALUES (
          p_user_id, v_a.name, v_a.position
        )
        RETURNING id INTO v_new_id;

        -- Update the attribute ID map with the new ID
        v_attribute_id_map := v_attribute_id_map || jsonb_build_object(v_a.client_key, v_new_id);
    END LOOP;

    -- 8. Update quest-attribute relationships
    FOR v_qa IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_quests_attributes_updates, '[]'::JSONB))
        AS x(id INT, quest_id INT, attribute_id INT, attribute_power INT)
    LOOP
        UPDATE public.quests_attributes
        SET attribute_power = v_qa.attribute_power,
            updated_at = NOW()
        WHERE id = v_qa.id
          AND user_id = p_user_id
          AND quest_id = v_qa.quest_id
          AND attribute_id = v_qa.attribute_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Quest-attribute relationship % not found for user %',
            v_qa.id, p_user_id;
        END IF;
    END LOOP;

    -- 9. Insert new quest-attribute relationships, resolving quest_id and attribute_id using the maps for client keys
    FOR v_qa IN
        SELECT * FROM jsonb_to_recordset(coalesce(p_quests_attributes_inserts, '[]'::JSONB))
        AS x(quest_id INT, quest_client_key TEXT, attribute_id INT, attribute_client_key TEXT, attribute_power INT)
    LOOP
        -- Check that at least one of quest_id or quest_client_key is null, and at least one of attribute_id or attribute_client_key is null
        IF (v_qa.quest_id IS NOT NULL AND v_qa.quest_client_key IS NOT NULL) OR
            (v_qa.attribute_id IS NOT NULL AND v_qa.attribute_client_key IS NOT NULL) THEN
          RAISE EXCEPTION 'For quest-attribute inserts, either quest_id or quest_client_key must be null, and either attribute_id or attribute_client_key must be null';
        END IF;

        -- Resolve the quest_id and attribute_id using the maps
        v_resolved_quest_id := COALESCE(v_qa.quest_id, (v_quest_id_map ->> v_qa.quest_client_key)::INT);
        v_resolved_attribute_id := COALESCE(v_qa.attribute_id, (v_attribute_id_map ->> v_qa.attribute_client_key)::INT);

        IF v_resolved_quest_id IS NULL THEN
          RAISE EXCEPTION 'Unable to resolve quest ID for client key %',
            v_qa.quest_client_key;
        END IF;

        IF v_resolved_attribute_id IS NULL THEN
          RAISE EXCEPTION 'Unable to resolve attribute ID for client key %',
            v_qa.attribute_client_key;
        END IF;

        -- Verify that the resolved quest and attribute belong to the user
        PERFORM 1 FROM public.quests
        WHERE id = v_resolved_quest_id AND user_id = p_user_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Resolved quest ID % does not belong to user %',
            v_resolved_quest_id, p_user_id;
        END IF;

        PERFORM 1 FROM public.attributes
        WHERE id = v_resolved_attribute_id AND user_id = p_user_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Resolved attribute ID % does not belong to user %',
            v_resolved_attribute_id, p_user_id;
        END IF;

        INSERT INTO public.quests_attributes (
          user_id, quest_id, attribute_id, attribute_power
        ) VALUES (
          p_user_id, v_resolved_quest_id, v_resolved_attribute_id, v_qa.attribute_power
        )
        ON CONFLICT (quest_id, attribute_id)
        DO UPDATE SET
            attribute_power = EXCLUDED.attribute_power,
            updated_at = NOW();
    END LOOP;

    -- If we reach this point, all operations were successful. Commit the transaction and return a success response.
    v_result := jsonb_build_object(
      'status', 'success',
      'message', 'Profile updated successfully',
      'quest_id_map', v_quest_id_map,
      'attribute_id_map', v_attribute_id_map
    );

    RETURN v_result;
END;
$$;
```
