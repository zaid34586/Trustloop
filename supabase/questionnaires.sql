-- ============================================================
-- Trustloop — Questionnaires feature schema
-- Run this file in the Supabase Dashboard > SQL Editor.
-- ============================================================

-- 1. Questionnaires table
create table if not exists public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  sheet_name text,
  question_col int,
  header_rows int not null default 1,
  status text not null default 'uploaded',
  total_questions int not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

-- 2. Questions table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  row_number int not null,
  question_text text not null,
  answer_text text,
  confidence text,
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Indexes
create index if not exists questions_user_questionnaire_idx
  on public.questions (user_id, questionnaire_id);

-- 4. Row Level Security
alter table public.questionnaires enable row level security;
alter table public.questions enable row level security;

-- questionnaires: users can select/insert/update/delete only their own rows
drop policy if exists "Users can view own questionnaires" on public.questionnaires;
create policy "Users can view own questionnaires"
  on public.questionnaires
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own questionnaires" on public.questionnaires;
create policy "Users can insert own questionnaires"
  on public.questionnaires
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own questionnaires" on public.questionnaires;
create policy "Users can update own questionnaires"
  on public.questionnaires
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own questionnaires" on public.questionnaires;
create policy "Users can delete own questionnaires"
  on public.questionnaires
  for delete
  using (auth.uid() = user_id);

-- questions: users can select/insert/update/delete only their own rows
drop policy if exists "Users can view own questions" on public.questions;
create policy "Users can view own questions"
  on public.questions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own questions" on public.questions;
create policy "Users can insert own questions"
  on public.questions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own questions" on public.questions;
create policy "Users can update own questions"
  on public.questions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own questions" on public.questions;
create policy "Users can delete own questions"
  on public.questions
  for delete
  using (auth.uid() = user_id);

-- 5. Keep questions.updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
  before update on public.questions
  for each row
  execute function public.set_updated_at();

-- 6. Private storage bucket "questionnaires"
insert into storage.buckets (id, name, public)
values ('questionnaires', 'questionnaires', false)
on conflict (id) do update
  set public = false;

-- 7. Storage policies: users can only access their own folder
--    ({user_id}/{unique-id}-{safe-file-name})
drop policy if exists "Users can upload to own questionnaires folder" on storage.objects;
create policy "Users can upload to own questionnaires folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'questionnaires'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own questionnaires folder" on storage.objects;
create policy "Users can read own questionnaires folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'questionnaires'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete from own questionnaires folder" on storage.objects;
create policy "Users can delete from own questionnaires folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'questionnaires'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
