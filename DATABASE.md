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
- `experience`: DECIMAL(10, 2) NOT NULL DEFAULT 0
  - Total experience points
- `updated_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Timestamp of last update

**users indexes**:

- `idx_users_usertag` ON (usertag)
  - Fast lookups by usertag for uniqueness checks

**attributes**: Player-defined attributes that level independently

- `id`: SERIAL PRIMARY KEY
  - Unique attribute identifier
- `user_id`: UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL
  - Owner of the attribute
- `name`: VARCHAR(50) NOT NULL
  - Attribute name (max 50 chars, unique per user)
- `level`: INT DEFAULT 1 NOT NULL
  - Current attribute level
- `experience`: DECIMAL(10, 2) NOT NULL DEFAULT 0
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
- `last_rest_date`: DATE
  - Date of last rest day
- `experience_share`: INT NOT NULL CHECK (experience_share BETWEEN 0 AND 100)
  - Amount (0–100) of daily experience points allocated to this quest as determined by the user
- `streak`: INT NOT NULL DEFAULT 0
  - Current streak count
- `strength_points`: INT NOT NULL DEFAULT 0
  - Accumulated strength points
- `strength_level`: strength_rank REFERENCES strength_levels(level) NOT NULL DEFAULT 'E'
  - Current strength rank (E-S)
- `last_completed_at`: TIMESTAMPTZ
  - Date of last completion
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
- `streak`: INT DEFAULT 1 NOT NULL
  - Streak at time of completion
- `experience_earned`: DECIMAL(8, 2) DEFAULT 0 NOT NULL
  - Experience points awarded
- `updated_at`: TIMESTAMPTZ DEFAULT NOW() NOT NULL
  - Timestamp of last update

**quest_completions indexes**:

- `idx_quest_completions_quest_id` ON (quest_id)
  - Fast lookups by quest
- `idx_quest_completions_completed_at` ON (completed_at)
  - Fast lookups by completion date
- `idx_quest_completions_unprocessed` ON (processed_at) WHERE processed_at IS NULL
  - Fast lookups by processing date for daily batch job

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

**progression_log**: Audit trail of all experience transactions from daily settlement pipeline

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

**progression_log Indexes**:

- `idx_progression_log_user_id` ON (user_id)
  - Fast lookups by user
- `idx_progression_log_created_at` ON (created_at)
  - Fast lookups by timestamp
- `idx_progression_log_user_created_at` ON (user_id, created_at)
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

### Functions and Triggers Reference

#### Handle New User Signup (Trigger)

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

#### Atomic Profile Creation Function

##### Example Call

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

#### Function Definition

-- Define function that takes user_id, array of attribute objects,
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
