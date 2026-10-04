-- ============================================================
-- Trustloop — FIX: "I could not find this in your documents"
-- Run this file in the Supabase Dashboard > SQL Editor, then
-- retry Generate answers / Ask. Safe to run more than once.
--
-- Root cause: search_chunks() used websearch_to_tsquery(), which
-- ANDs every word of your question. A natural question almost never
-- matches every word inside one 1000-char chunk, so the search
-- returned 0 rows and both routes replied "not found" instantly —
-- the AI was never called. The function below ORs the same (stemmed,
-- safe) terms and ranks chunks containing ALL terms first.
-- ============================================================

-- 1. Select policy (harmless if it already exists)
drop policy if exists "Users can view own chunks" on public.document_chunks;
create policy "Users can view own chunks"
  on public.document_chunks
  for select
  using (auth.uid() = user_id);

-- 2. Fixed search function
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

-- 3. Make sure the authenticated role can call it
grant execute on function public.search_chunks(text, int) to authenticated;

-- 4. Optional sanity check (run manually): should return rows now
-- select * from public.search_chunks('how often should passwords be changed', 6);
