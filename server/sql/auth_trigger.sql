-- ============================================================
-- HEMO-HERO - AUTH USER PROFILE TRIGGER
--
-- Whenever Supabase Auth creates a new auth.users account,
-- this trigger automatically creates the corresponding
-- public.users application profile.
--
-- Profile information comes from raw_user_meta_data supplied
-- by POST /api/auth/register.
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (
    id,
    email,
    first_name,
    middle_name,
    last_name,
    suffix,
    phone,
    date_of_birth
  )
  values (
    new.id,
    new.email,

    -- Required name fields
    coalesce(
      new.raw_user_meta_data->>'first_name',
      ''
    ),

    -- Optional middle name
    nullif(
      new.raw_user_meta_data->>'middle_name',
      ''
    ),

    coalesce(
      new.raw_user_meta_data->>'last_name',
      ''
    ),

    -- Optional suffix
    nullif(
      new.raw_user_meta_data->>'suffix',
      ''
    ),

    -- Optional phone
    nullif(
      new.raw_user_meta_data->>'phone',
      ''
    ),

    -- DOB is supplied as YYYY-MM-DD by the backend
    nullif(
      new.raw_user_meta_data->>'date_of_birth',
      ''
    )::date
  );

  return new;
end;
$$;

-- ============================================================
-- AUTH USER CREATED TRIGGER
--
-- Drop first so this SQL file can safely be rerun when the
-- trigger definition changes.
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();