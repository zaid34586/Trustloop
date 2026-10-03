-- ============================================================
-- Trustloop — database verification (READ-ONLY)
--
-- Run this in the Supabase SQL Editor AFTER supabase/all.sql.
-- It only SELECTs — nothing here modifies data or schema.
--
-- What you should see:
--   1. Every public table with rls = 'ENABLED'
--   2. Policies for each table (documents includes an UPDATE policy;
--      storage.objects has 3 policies per bucket)
--   3. Both buckets listed with public = false
--   4. search_chunks present as security invoker
-- ============================================================

-- ------------------------------------------------------------
-- 1. All public tables and whether Row Level Security is enabled
-- ------------------------------------------------------------
select
  c.relname as table_name,
  case when c.relrowsecurity then 'ENABLED' else 'disabled' end as rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- ------------------------------------------------------------
-- 2. All policies (app tables + storage objects)
-- ------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- ------------------------------------------------------------
-- 3. Storage buckets (public must be false for both)
-- ------------------------------------------------------------
select id, name, public
from storage.buckets
order by id;

-- ------------------------------------------------------------
-- 4. search_chunks function (must exist, security invoker)
-- ------------------------------------------------------------
select
  p.proname as function_name,
  case when p.prosecdef then 'security definer' else 'security invoker' end as security_type,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'search_chunks';
