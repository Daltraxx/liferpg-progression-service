# Edit Profile Transaction Function

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
