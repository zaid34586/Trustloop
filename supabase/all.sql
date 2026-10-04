-- ============================================================
-- Trustloop — complete database setup (single script)
--
-- Builds the entire schema from an EMPTY database in dependency
-- order. Safe to run more than once: every statement is
-- idempotent (if not exists / create or replace / drop if exists /
-- on conflict do nothing).
--
-- How to use:
--   1. Supabase Dashboard > SQL Editor > New query
--   2. Paste this file and run it ONCE
--   3. Run supabase/verify.sql to confirm the setup
--
-- No secrets belong in this file.
-- ============================================================


-- ------------------------------------------------------------
-- 1. profiles — one row per auth user (written by the signup trigger)
--    App usage: not read by app code yet, but created for every
--    signup. RLS: select + update on own row only.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ------------------------------------------------------------
-- 2. Signup trigger — insert a profile row for every new auth user
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ------------------------------------------------------------
-- 3. documents — uploaded security files (PDF/DOCX)
--    App usage: select/insert/delete on the documents page,
--    UPDATE in /api/documents/process (status = processing | ready |
--    failed, error_message) — so an update policy is required.
--    error_message is used by the process route for failure reasons.
-- ------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  file_type text not null,
  status text not null default 'uploaded',
  error_message text,
  created_at timestamptz not null default now()
);

-- Upgrade path for databases created by the old split scripts.
alter table public.documents
  add column if not exists error_message text;

alter table public.documents enable row level security;

drop policy if exists "Users can view own documents" on public.documents;
create policy "Users can view own documents"
  on public.documents
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
  on public.documents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
  on public.documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents
  for delete
  using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 4. document_chunks — extracted text chunks + full-text search column
--    App usage: insert + delete (reprocess) in /api/documents/process,
--    select via the search_chunks function. No updates in app code.
-- ------------------------------------------------------------
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  tsv tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

-- GIN index backing the full-text search.
create index if not exists document_chunks_tsv_idx
  on public.document_chunks using gin (tsv);

create index if not exists document_chunks_user_doc_idx
  on public.document_chunks (user_id, document_id);

alter table public.document_chunks enable row level security;

drop policy if exists "Users can view own chunks" on public.document_chunks;
create policy "Users can view own chunks"
  on public.document_chunks
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own chunks" on public.document_chunks;
create policy "Users can insert own chunks"
  on public.document_chunks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chunks" on public.document_chunks;
create policy "Users can delete own chunks"
  on public.document_chunks
  for delete
  using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 5. search_chunks — full-text search over the user's own chunks.
--    Called via supabase.rpc("search_chunks") in /api/ask and
--    /api/questions/answer. security invoker => RLS applies, so
--    results are always limited to the current user's rows.
--    Must be created after documents + document_chunks exist.
--
--    IMPORTANT: websearch_to_tsquery() ANDs every word ('a' & 'b'),
--    which almost never matches a natural-language question against a
--    short chunk — that made both routes return 0 rows and reply
--    "not found" instantly without ever calling the AI. The query
--    below rebuilds the same stemmed terms as an OR query (loose)
--    so any relevant term matches, and ranks chunks that match ALL
--    terms first (strict) to keep precision.
-- ------------------------------------------------------------
create or replace function public.search_chunks(
  query_text text,
  match_count int default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  file_name text,
  content text,
  rank real
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select
      websearch_to_tsquery('english', coalesce(query_text, '')) as strict_q,
      nullif(
        replace(
          websearch_to_tsquery('english', coalesce(query_text, ''))::text,
          ' & ',
          ' | '
        ),
        ''
      ) as loose_expr
  )
  select
    dc.id as chunk_id,
    dc.document_id,
    d.file_name,
    dc.content,
    ts_rank(dc.tsv, to_tsquery('english', q.loose_expr)) as rank
  from q
  join public.document_chunks dc
    on dc.tsv @@ to_tsquery('english', q.loose_expr)
  join public.documents d on d.id = dc.document_id
  order by (dc.tsv @@ q.strict_q) desc,
           ts_rank(dc.tsv, to_tsquery('english', q.loose_expr)) desc
  limit match_count;
$$;


-- ------------------------------------------------------------
-- 6. questionnaires — uploaded .xlsx questionnaire files
--    App usage: full CRUD (list/upload, column-confirm update,
--    status rollups in /api/questions/answer, delete).
-- ------------------------------------------------------------
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

alter table public.questionnaires enable row level security;

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


-- ------------------------------------------------------------
-- 7. questions — extracted questions + AI answers + review state
--    App usage: full CRUD (extract insert, answer generation
--    updates, review edit/approve updates, status rollups).
--    Review columns edited_by_user / approved_at are used by the
--    review workflow in /dashboard/questionnaires/[id].
-- ------------------------------------------------------------
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
  edited_by_user boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path for databases created by the old split scripts.
alter table public.questions
  add column if not exists edited_by_user boolean not null default false;

alter table public.questions
  add column if not exists approved_at timestamptz;

create index if not exists questions_user_questionnaire_idx
  on public.questions (user_id, questionnaire_id);

alter table public.questions enable row level security;

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

-- Keep questions.updated_at current on every update.
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


-- ------------------------------------------------------------
-- 8. ai_usage — one row per AI call, used for rate limiting
--    (60 calls/hour, 300/day). Read+written by the API routes
--    with the user's session. RLS: select + insert own rows only.
-- ------------------------------------------------------------
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  route text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at);

alter table public.ai_usage enable row level security;

drop policy if exists "Users can view own usage" on public.ai_usage;
create policy "Users can view own usage"
  on public.ai_usage
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage" on public.ai_usage;
create policy "Users can insert own usage"
  on public.ai_usage
  for insert
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 9. Storage buckets — private "documents" and "questionnaires"
--    App usage: upload / download / signed URL / remove.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('questionnaires', 'questionnaires', false)
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 10. Storage policies — per bucket, own folder only.
--    App file paths are "{user_id}/{uuid}-{safe-name}", so the
--    first folder segment must equal the caller's uid.
--    Operations used by the app: upload (insert), read/download
--    and createSignedUrl (select), remove (delete). No updates.
-- ------------------------------------------------------------

-- documents bucket
drop policy if exists "Users can upload to own documents folder" on storage.objects;
create policy "Users can upload to own documents folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own documents folder" on storage.objects;
create policy "Users can read own documents folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete from own documents folder" on storage.objects;
create policy "Users can delete from own documents folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- questionnaires bucket
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


-- ------------------------------------------------------------
-- 11. Privileges — make sure the logged-in role can reach the
--     tables/functions; RLS then restricts every query to the
--     user's own rows. (Harmless to re-run.)
-- ------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.search_chunks(text, int) to authenticated;
