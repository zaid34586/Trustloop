-- ============================================================
-- Trustloop — Documents feature schema
-- Run this file in the Supabase Dashboard > SQL Editor.
-- ============================================================

-- 1. Documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  file_type text not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now()
);

-- 2. Row Level Security: a user can only select/insert/update/delete their own rows
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

-- UPDATE is required: /api/documents/process sets status =
-- 'processing' | 'ready' | 'failed' and error_message on this table.
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

-- 3. Private storage bucket "documents"
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update
  set public = false;

-- 4. Storage policies: users can only access files inside their own
--    folder ({user_id}/...), never anyone else's.
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
