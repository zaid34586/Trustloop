-- ============================================================
-- Trustloop — no free plan: paid tiers only, per-plan limits
--
-- Summary (plain language):
--   1. Removes the trial (free) plan: profiles.plan now defaults
--      to 'starter'; existing trial users move to 'starter';
--      the CHECK only allows starter/growth/business.
--   2. Deletes the trial row from plans and rewrites the feature
--      lists so each paid tier shows what its price includes.
--   3. Adds public.plan_limit(text) — the caller's plan limit for
--      a key ('documents', 'questionnaires_per_month',
--      'ai_requests_per_day', 'seats'); null in the plan's limits
--      means unlimited; falls back to the starter plan.
--   4. Adds BEFORE INSERT triggers on documents and questionnaires
--      that raise PLAN_LIMIT_DOCUMENTS / PLAN_LIMIT_QUESTIONNAIRES
--      when the plan's quota is used up (counted for auth.uid()).
--
-- AI per-day limits are enforced in lib/ai.ts (same plan limits).
-- ============================================================

begin;

-- The plan-change trigger (prevent_plan_self_change) only lets
-- service_role or an admin past it; this file runs as a migration
-- with no JWT, so set the claims for this transaction only.
set local request.jwt.claims to '{"role":"service_role"}';

-- ------------------------------------------------------------
-- 1. profiles.plan: default starter, migrate trial users
-- ------------------------------------------------------------
update public.profiles
   set plan = 'starter'
 where plan = 'trial';

alter table public.profiles
  alter column plan set default 'starter';

alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('starter', 'growth', 'business'));

-- ------------------------------------------------------------
-- 2. drop the free plan, differentiate paid features by tier
-- ------------------------------------------------------------
delete from public.plans where key = 'trial';

update public.plans
   set features = array[
     'Document upload',
     'AI-drafted answers with sources',
     'Review and approval',
     'Excel export',
     'Ask page',
     'Up to 25 documents and 15 questionnaires a month',
     '200 AI answers a day',
     'Email support'
   ]
 where key = 'starter';

update public.plans
   set features = array[
     'Document upload',
     'AI-drafted answers with sources',
     'Review and approval',
     'Excel export',
     'Ask page',
     'Up to 100 documents and 60 questionnaires a month',
     '600 AI answers a day',
     'Priority support — Coming soon'
   ]
 where key = 'growth';

update public.plans
   set features = array[
     'Document upload',
     'AI-drafted answers with sources',
     'Review and approval',
     'Excel export',
     'Ask page',
     'Unlimited documents and questionnaires',
     '2,000 AI answers a day',
     'Onboarding call — Coming soon',
     'Dedicated support — Coming soon'
   ]
 where key = 'business';

-- ------------------------------------------------------------
-- 3. plan_limit(): the caller's limit for one limits key
--    (null in the plan's limits = unlimited; missing plan row =
--    starter's limit as a safe fallback)
-- ------------------------------------------------------------
create or replace function public.plan_limit(limit_name text)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select case
              when pl.limits ->> limit_name is null then 2147483647
              else (pl.limits ->> limit_name)::int
            end
       from public.profiles pr
       join public.plans pl on pl.key = pr.plan
      where pr.id = auth.uid()),
    (select case
              when pl.limits ->> limit_name is null then 2147483647
              else (pl.limits ->> limit_name)::int
            end
       from public.plans pl
      where pl.key = 'starter'),
    25)
$$;

revoke all on function public.plan_limit(text) from public;
grant execute on function public.plan_limit(text) to authenticated;

-- ------------------------------------------------------------
-- 4. quota triggers (specific errors the UI maps to messages)
-- ------------------------------------------------------------
create or replace function public.enforce_document_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*)
        from public.documents d
       where d.user_id = auth.uid())
       >= public.plan_limit('documents') then
    raise exception 'PLAN_LIMIT_DOCUMENTS';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_document_quota on public.documents;
create trigger enforce_document_quota
  before insert on public.documents
  for each row
  execute function public.enforce_document_quota();

create or replace function public.enforce_questionnaire_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*)
        from public.questionnaires q
       where q.user_id = auth.uid()
         and q.created_at >= date_trunc('month', now()))
       >= public.plan_limit('questionnaires_per_month') then
    raise exception 'PLAN_LIMIT_QUESTIONNAIRES';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_questionnaire_quota on public.questionnaires;
create trigger enforce_questionnaire_quota
  before insert on public.questionnaires
  for each row
  execute function public.enforce_questionnaire_quota();

commit;
