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
  - Ensures each user has unique attribute ordering, deferrable to handle reordering within a transaction

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
  - Ensures each user has unique quest ordering, deferrable to handle reordering within a transaction
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
  - target indicates where the points are applied (users(experience), quests(strength_points), or attributes(experience))
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