# Get Settlement Data Function

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
