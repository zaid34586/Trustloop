-- ============================================================
-- Trustloop — protect profiles.role from client-side changes
--
-- Summary: adds BEFORE UPDATE trigger function
-- prevent_role_self_change on public.profiles. Any UPDATE that
-- changes the role column is rejected with an exception unless
-- the request runs with service_role (i.e. the dashboard/backend).
-- Updates that do not touch role pass through unchanged, so the
-- settings page (full_name/company_name) keeps working.
-- ============================================================

create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(
           current_setting('request.jwt.claims', true)::jsonb ->> 'role',
           'authenticated'
         ) <> 'service_role'
  then
    raise exception 'profiles.role cannot be changed by the client';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_role on public.profiles;
create trigger protect_profiles_role
  before update on public.profiles
  for each row
  execute function public.prevent_role_self_change();
