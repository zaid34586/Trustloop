-- ============================================================
-- Trustloop — Review & export feature schema
-- Run this file in the Supabase Dashboard > SQL Editor.
-- ============================================================

-- New columns on questions
alter table public.questions
  add column if not exists edited_by_user boolean not null default false;

alter table public.questions
  add column if not exists approved_at timestamptz;

-- Row Level Security is unchanged: the existing policies already limit
-- select/insert/update/delete to the owning user, so users can only
-- update their own rows (including these new columns).
