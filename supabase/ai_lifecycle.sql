-- Phase 4: GPU lifecycle state — ONE shared row (one GPU pool for
-- every account). Tracks the last user activity and the instance
-- state so /api/ai/warmup can auto-start and /api/cron/ai-idle can
-- auto-stop after AI_IDLE_MINUTES (default 10) of no activity.
--
-- Applied via the Supabase Management API.
-- Rollback: ../rollbacks/ai_lifecycle.sql
begin;

create table if not exists public.ai_lifecycle (
  key text primary key,
  state text not null default 'stopped'
    check (state in ('stopped', 'starting', 'running', 'stopping', 'unknown')),
  last_activity timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_lifecycle enable row level security;

-- Signed-in users read/refresh the heartbeat (warmup route).
-- The cron route uses the service role, which bypasses RLS.
-- No anon access: anon has no policies here.
drop policy if exists ai_lifecycle_select on public.ai_lifecycle;
create policy ai_lifecycle_select on public.ai_lifecycle
  for select to authenticated using (true);

drop policy if exists ai_lifecycle_insert on public.ai_lifecycle;
create policy ai_lifecycle_insert on public.ai_lifecycle
  for insert to authenticated with check (true);

drop policy if exists ai_lifecycle_update on public.ai_lifecycle;
create policy ai_lifecycle_update on public.ai_lifecycle
  for update to authenticated using (true) with check (true);

insert into public.ai_lifecycle (key, state)
values ('gpu', 'stopped')
on conflict (key) do nothing;

commit;
