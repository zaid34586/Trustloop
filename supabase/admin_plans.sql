-- ============================================================
-- Trustloop — admin panel foundation (plans + offers + user plans)
--
-- Summary (plain language):
--   1. Adds profiles.plan ('trial'|'starter'|'growth'|'business')
--      with a CHECK constraint and a trigger so only service_role
--      or an admin may change a user's plan.
--   2. Adds public.is_admin() — true when the caller's profile has
--      role = 'admin' (SECURITY DEFINER, RLS-safe).
--   3. Adds public.plans and public.offers (RLS enabled): any
--      signed-in user can read, only admins can write.
--   4. Seeds the four pricing plans with features and limits.
--   5. Lets admins read all profiles and assign plans (role column
--      stays protected by the existing trigger).
--
-- Limits jsonb shape: documents, questionnaires_per_month,
-- ai_requests_per_day, seats — null means unlimited.
-- price_yearly = per-month price when billed yearly.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. profiles.plan
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists plan text not null default 'trial';

alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('trial', 'starter', 'growth', 'business'));

-- ------------------------------------------------------------
-- 2. is_admin()
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin'
       from public.profiles p
      where p.id = auth.uid()),
    false)
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 3. protect profiles.plan from self-upgrade
-- ------------------------------------------------------------
create or replace function public.prevent_plan_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan is distinct from old.plan
     and coalesce(
           current_setting('request.jwt.claims', true)::jsonb ->> 'role',
           'authenticated'
         ) <> 'service_role'
     and not public.is_admin()
  then
    raise exception 'profiles.plan can only be changed by an admin';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_plan on public.profiles;
create trigger protect_profiles_plan
  before update on public.profiles
  for each row
  execute function public.prevent_plan_self_change();

-- ------------------------------------------------------------
-- 4. plans table
-- ------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique
    check (key in ('trial', 'starter', 'growth', 'business')),
  name text not null,
  price_monthly numeric(10, 2) not null default 0,
  price_yearly numeric(10, 2) not null default 0,
  features text[] not null default '{}',
  limits jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. offers table
-- ------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans (id) on delete cascade,
  code text not null unique,
  percent integer not null check (percent between 1 and 100),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. RLS on plans and offers
-- ------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.offers enable row level security;

drop policy if exists "plans_select_authenticated" on public.plans;
create policy "plans_select_authenticated" on public.plans
  for select to authenticated
  using (true);

drop policy if exists "plans_admin_write" on public.plans;
create policy "plans_admin_write" on public.plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "offers_select_authenticated" on public.offers;
create policy "offers_select_authenticated" on public.offers
  for select to authenticated
  using (true);

drop policy if exists "offers_admin_write" on public.offers;
create policy "offers_admin_write" on public.offers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.plans to authenticated;
grant insert, update, delete on public.plans to authenticated;
grant select on public.offers to authenticated;
grant insert, update, delete on public.offers to authenticated;

-- ------------------------------------------------------------
-- 7. admin access to profiles (read all + assign plan)
--    profiles.role stays protected by prevent_role_self_change;
--    profiles.plan is protected by prevent_plan_self_change.
-- ------------------------------------------------------------
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 8. seed the four pricing plans
-- ------------------------------------------------------------
insert into public.plans
  (key, name, price_monthly, price_yearly, features, limits, sort_order)
values
  ('trial', 'Trial', 0, 0,
   array['Document upload', 'AI-drafted answers with sources',
         'Review and approval', 'Excel export', 'Ask page'],
   '{"documents": 3, "questionnaires_per_month": 2,
     "ai_requests_per_day": 50, "seats": 1}'::jsonb,
   0),
  ('starter', 'Starter', 149, 119,
   array['Document upload', 'AI-drafted answers with sources',
         'Review and approval', 'Excel export', 'Ask page'],
   '{"documents": 25, "questionnaires_per_month": 15,
     "ai_requests_per_day": 200, "seats": 3}'::jsonb,
   1),
  ('growth', 'Growth', 349, 279,
   array['Document upload', 'AI-drafted answers with sources',
         'Review and approval', 'Excel export', 'Ask page',
         'Priority support — Coming soon'],
   '{"documents": 100, "questionnaires_per_month": 60,
     "ai_requests_per_day": 600, "seats": 10}'::jsonb,
   2),
  ('business', 'Business', 799, 639,
   array['Document upload', 'AI-drafted answers with sources',
         'Review and approval', 'Excel export', 'Ask page',
         'Onboarding call — Coming soon',
         'Dedicated support — Coming soon'],
   '{"documents": null, "questionnaires_per_month": null,
     "ai_requests_per_day": 2000, "seats": null}'::jsonb,
   3)
on conflict (key) do nothing;

commit;
