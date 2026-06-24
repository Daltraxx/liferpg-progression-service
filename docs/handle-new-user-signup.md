# Handle New User Signup (Trigger)

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

## Example Call

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