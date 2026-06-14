## Database Overview

### Tables

Full table can be found on the Supabase dashboard.

**strength_levels**: Lookup table for strength rank multipliers (E-S)

- `level`: strength_rank PRIMARY KEY
  - Strength rank enum (E, D, C, B, A, S)
- `multiplier`: DECIMAL(4, 2) NOT NULL
  - Multiplier for experience calculation
- `min_points`: INT NOT NULL
  - Minimum strength points required for this rank
- `max_points`: INT
  - Maximum strength points for this rank (null for S)
- `updated_at`: TIMESTAMPTZ DEFAULT NOW()
  - Timestamp of last update

**users**: Core user accounts with level and experience tracking

- Note: This is separate from the Supabase auth.users table, which handles authentication.
- The users table in our schema is for application-specific user data and links to auth.users via the id field.

- RLS Policies:
  - Users can only SELECT, UPDATE, DELETE their own record (WHERE id = auth.uid())
  - Anon users only have access to reading the usertag field for uniqueness checks during account creation (SELECT usertag WHERE usertag = $1)

- `id`: UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
  - User identifier linked to authentication
- `username`: VARCHAR(50) NOT NULL
  - Username (max 50 chars)
- `usertag`: VARCHAR(50) UNIQUE NOT NULL
  - Unique usertag for potential social features
- `email`: VARCHAR(255) UNIQUE NOT NULL
  - User email address
- `purpose`: VARCHAR(500)
  - Optional user-defined purpose statement (max 500 chars)
- `timezone`: TEXT NOT NULL DEFAULT 'UTC'
  - User's timezone for scheduling and timestamps
- `created_at`: TIMESTAMPTZ DEFAULT NOW()
  - Account creation timestamp
- `last_login`: TIMESTAMPTZ
  - Last login timestamp
- `verified`: BOOLEAN DEFAULT FALSE NOT NULL
  - Account verification status
- `profile_complete`: BOOLEAN DEFAULT FALSE NOT NULL
  - Whether user has defined their quests and attributes
- `level`: INT DEFAULT 1 NOT NULL
  - Overall player level
- `experience`: INT NOT NULL DEFAULT 0
  - Total experience points
- `updated_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Timestamp of last update

**users indexes**:

- `idx_users_usertag` ON (usertag)
  - Fast lookups by usertag for uniqueness checks
- `idx_users_timezone` ON (timezone)
  - Fast lookups by timezone for batch processing

**attributes**: Player-defined attributes that level independently

- `id`: SERIAL PRIMARY KEY
  - Unique attribute identifier
- `user_id`: UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL
  - Owner of the attribute
- `name`: VARCHAR(50) NOT NULL
  - Attribute name (max 50 chars, unique per user)
- `level`: INT DEFAULT 1 NOT NULL
  - Current attribute level
- `experience`: INT NOT NULL DEFAULT 0
  - Attribute experience points
- `position`: INT NOT NULL CHECK (position >= 0)
  - Display order for attribute list (unique per user)
  - Position is zero-indexed and handled before insertion in application logic
- `created_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Creation timestamp
- `updated_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Timestamp of last update
- UNIQUE (user_id, name)
  - Ensures attribute names are unique per user
- UNIQUE (user_id, position)
  - Ensures each user has unique attribute ordering

**attributes indexes**:

- `idx_attributes_user_id` ON (user_id)
  - Fast lookups by user

**quests**: Quests assigned by users with frequency, streak, and strength mechanics

- `id`: SERIAL PRIMARY KEY
  - Unique quest identifier
- `user_id`: UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL
  - Owner of the quest
- `name`: VARCHAR(200) NOT NULL
  - Quest name (max 200 chars)
- `description`: TEXT
  - Optional quest description
- `created_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Creation timestamp
- `frequency`: INT NOT NULL DEFAULT 1 CHECK (frequency >= 0)
  - Interval in days between required completions (1 = daily, 7 = weekly, etc.)
- `rest_frequency`: INT NOT NULL DEFAULT 0 CHECK (rest_frequency >= 0)
  - Allowed rest days without streak reset
- `rest_progress`: INT NOT NULL DEFAULT 0
  - Represents progress towards next rest day where not completing required quest does not result in penalties
- `experience_share`: INT NOT NULL CHECK (experience_share BETWEEN 0 AND 100)
  - Amount (0–100) of daily experience points allocated to this quest as determined by the user
- `streak`: INT NOT NULL DEFAULT 0
  - Current streak count
- `strength_points`: INT NOT NULL DEFAULT 0
  - Accumulated strength points
- `strength_level`: strength_rank REFERENCES strength_levels(level) NOT NULL DEFAULT 'E'
  - Current strength rank (E-S)
- `last_completed_date`: DATE
  - Activity date of last completion (the date the completion belongs to, even if completed after midnight but before the user's daily boundary)
- `position`: INT NOT NULL CHECK (position >= 0)
  - Display order for quest list (unique per user)
  - Position is zero-indexed and handled before insertion
- `updated_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Timestamp of last update
- UNIQUE (user_id, position)
  - Ensures each user has unique quest ordering
- UNIQUE (user_id, name)
  - Ensures quest names are unique per user

**quests indexes**:

- `idx_quests_user_id` ON (user_id)
  - Fast lookups by user

**quest_completions**: Records each quest completion with streak and experience earned

- `id`: SERIAL PRIMARY KEY
  - Unique completion record identifier
- `quest_id`: INT REFERENCES quests(id) ON DELETE CASCADE NOT NULL
  - Reference to completed quest
- `user_id`: UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL
  - User who completed the quest
- `completed_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Completion timestamp
- `processed_at`: TIMESTAMPTZ
  - Timestamp when this completion was processed for experience and streak updates
- `experience_earned`: INT DEFAULT 0 NOT NULL
  - Experience points awarded
- `updated_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Timestamp of last update

**quest_completions indexes**:

- `idx_quest_completions_quest_id` ON (quest_id)
  - Fast lookups by quest
- `idx_quest_completions_completed_at` ON (completed_at)
  - Fast lookups by completion date
- `idx_quest_completions_user_unprocessed` ON (user_id) WHERE processed_at IS NULL
  - Fast lookups for unprocessed completions by user

**quests_attributes**: Junction table linking quests to attributes with power multipliers

- `id`: SERIAL PRIMARY KEY
  - Unique junction record identifier
- `user_id`: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - Owner of the quest-attribute relationship
- `quest_id`: INT NOT NULL REFERENCES quests(id) ON DELETE CASCADE
  - Reference to quest
- `attribute_id`: INT NOT NULL REFERENCES attributes(id) ON DELETE CASCADE
  - Reference to attribute
- `attribute_power`: INT DEFAULT 1 NOT NULL
  - Power multiplier for this attribute
- `updated_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Timestamp of last update
- UNIQUE (quest_id, attribute_id)
  - Ensures each quest-attribute pair is unique

**quests_attributes indexes**:

- `idx_quests_attributes_user_id` ON (user_id)
  - Fast lookups by user
- `idx_quests_attributes_quest_id` ON (quest_id)
  - Fast lookups by quest
- `idx_quests_attributes_attribute_id` ON (attribute_id)
  - Fast lookups by attribute

**progression_logs**: Audit trail of all experience transactions from daily settlement pipeline

- Notes on insertions:
  - Each record represents a single experience change event, whether from quest completion, level up, or attribute progression
  - target indicates where the points are applied (users(experience), quests(quest_strength_points), or attributes(experience))
  - user_id is always required to link the transaction to a user, but attribute_id may be null if the transaction is not related to a specific attribute
  - quest_id is always required upon insert due to all experience being the result of quest completions
  - quest_id is only nullable in case the quest is deleted in the future, but quest_name is stored for reference.
  - attribute_id is required if target is attribute, but must otherwise be null.
  - attribute_name, like quest_name, is stored for reference in case the related attribute is deleted in the future,
    but is not required upon insertion if attribute_id is null.
  - When inserting records:
    - If inserting with target of user, quest_id must be provided (users earn experience from quests) and attribute_id must be null
    - If inserting with target of attribute, all ids (user_id, quest_id, attribute_id) must be provided
    - If inserting with target of quest_strength, user_id and quest_id must be provided, but attribute_id must be null
      (quest strength progression is not related to a specific attribute)
    - TODO: Document rules on format for for reason field
      (e.g. "Completed quest: {quest_name} with streak {streak}", "Leveled up attribute: {attribute_name} due to completion of {quest_name}",
      "Completed quest: {quest_name} and earned {points} + {bonus_points} from strength level {strength_level}")

- `id`: SERIAL PRIMARY KEY
  - Unique log entry identifier
- `target`: TEXT NOT NULL CHECK (target IN ('user', 'quest_strength', 'attribute'))
  - What the experience change applies to (overall user, quest strength, or attribute)
- `reason`: TEXT NOT NULL
  - Description of transaction
- `user_id`: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - User who earned/lost experience
- `quest_id`: INT REFERENCES quests(id) ON DELETE SET NULL
  - Related quest (nullable)
- `quest_name`: TEXT
  - Name of related quest (nullable, paired with quest_id via CHECK constraint)
- `attribute_id`: INT REFERENCES attributes(id) ON DELETE SET NULL
  - Related attribute (nullable)
- `attribute_name`: TEXT
  - Name of related attribute (nullable, paired with attribute_id via CHECK constraint)
- `points`: INT NOT NULL
  - Points in transaction
- `daily_batch_id`: INT NOT NULL REFERENCES daily_progression_batches(id) ON DELETE CASCADE
  - Reference to daily batch for this transaction
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - Transaction timestamp
- CHECK constraint: (quest_id IS NULL OR quest_name IS NOT NULL) AND (attribute_id IS NULL OR attribute_name IS NOT NULL)
  - Ensures quest_name exists when quest_id is set, and attribute_name exists when attribute_id is set

**progression_logs Indexes**:

- `idx_progression_logs_user_id` ON (user_id)
  - Fast lookups by user
- `idx_progression_logs_created_at` ON (created_at)
  - Fast lookups by timestamp
- `idx_progression_logs_user_created_at` ON (user_id, created_at)
  - Fast lookups by user and timestamp range

**daily_progression_batches**: Tracks execution of daily progression batch job for auditing and debugging

- `id`: SERIAL PRIMARY KEY
  - Unique batch record identifier
- `user_id`: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - User associated with the batch
- `processed_at`: TIMESTAMPTZ NOT NULL
  - Timestamp when batch was processed
- `activity_date`: DATE NOT NULL
  - Date for which daily progression was calculated
- `user_timezone`: TEXT NOT NULL
  - User's timezone used for daily boundary calculation
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - Record creation timestamp
- UNIQUE (user_id, activity_date)
  - Ensures only one batch per user per day

**daily_progression_batches Indexes**:

- `idx_daily_progression_batches_user_id` ON (user_id)
  - Fast lookups by user
- `idx_daily_progression_batches_activity_date` ON (activity_date)
  - Fast lookups by activity date
- `idx_daily_progression_batches_user_activity_date` ON (user_id, activity_date)
  - Fast lookups by user and activity date

### Key Features

- Strength rank system (E-S) applies experience multipliers to quest rewards
- Frequency and rest_frequency fields support flexible habit scheduling
- Experience shared across user level, individual attributes, and quest streaks
- Cascading deletes maintain referential integrity when users or quests are removed
- Trigger upon insertion to Supabase auth.users that inserts user to project users table
- Function to create user profile with attributes and quests in single atomic transaction

### Strength Levels Reference (from setup)

INSERT INTO strength_levels (level, multiplier, min_points, max_points) VALUES
('E', 0, 0, 99),
('D', 0.20, 100, 199),
('C', 0.40, 200, 299),
('B', 0.60, 300, 399),
('A', 0.80, 400, 499),
('S', 1.00, 500, NULL);

---------------------------------------------------------------------------------------

## Functions and Triggers Reference

### Handle New User Signup (Trigger)
-- This trigger function listens for new user insertions into the auth.users table (handled by Supabase authentication) 
-- and creates a corresponding record in our application-specific users table. 
-- It extracts the email, username, and usertag from the raw_user_meta_data JSON field provided by Supabase during signup. 
-- This ensures that every authenticated user has a corresponding profile in our users table, 
-- which is necessary for linking quests, attributes, and progression data.

```sql
-- Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS
$$
BEGIN
  INSERT INTO public.users (id, email, username, usertag)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'usertag');
  RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger
CREATE TRIGGER after_user_signup_create_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
```

### Atomic Profile Creation Function

#### Example Call

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

### Create Profile Transaction Function

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

### Commit Progression Function
-- Function to commit user progression updates to the database in a transaction
-- Takes processed progression data for a user and the activity date for which the progression is being committed
-- This function is intended to be called for each user during the daily settlement batch job after calculations have been performed based on the data retrieved from get_settlement_users_data. It will handle all necessary updates to the users, quests, attributes, and progression_logs tables in a single transaction to ensure data integrity. The function also includes validation of the input data and error handling to catch any issues during the update process.
-- Safe to call multiple times for the same user and activity date due to the unique constraint on daily_progression_batches, which prevents duplicate processing and allows for idempotent retries in case of failures.
-- Service role permissions are required to execute this function and its helper function due to the need for updating multiple tables and ensuring proper access control.

``` sql
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