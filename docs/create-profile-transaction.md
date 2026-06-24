# Create Profile Transaction Function

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