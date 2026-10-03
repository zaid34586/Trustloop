-- ============================================================
-- Trustloop — Document chunks + AI search schema
-- Run this file in the Supabase Dashboard > SQL Editor.
-- ============================================================

-- 0. error_message column on documents (if missing)
alter table public.documents
  add column if not exists error_message text;

-- 1. Document chunks table
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  tsv tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

-- 2. Indexes
create index if not exists document_chunks_tsv_idx
  on public.document_chunks using gin (tsv);

create index if not exists document_chunks_user_doc_idx
  on public.document_chunks (user_id, document_id);

-- 3. Row Level Security: users can only select/insert/delete their own rows
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

-- 4. Search function (security invoker: RLS applies, so results are
--    always limited to the current user's chunks)
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
  select
    dc.id as chunk_id,
    dc.document_id,
    d.file_name,
    dc.content,
    ts_rank(dc.tsv, websearch_to_tsquery('english', query_text)) as rank
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.tsv @@ websearch_to_tsquery('english', query_text)
  order by rank desc
  limit match_count;
$$;
