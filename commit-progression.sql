create or replace function public.commit_progression(p_processed_progression_data jsonb)
returns void
language sql
security definer
set search_path = public
as $$
