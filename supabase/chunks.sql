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
--    websearch_to_tsquery() ANDs every word, which almost never
--    matches a natural question against a short chunk (both routes
--    then replied "not found" instantly without calling the AI).
--    Rebuild the stemmed terms as an OR query and rank chunks that
--    contain ALL terms first.
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
