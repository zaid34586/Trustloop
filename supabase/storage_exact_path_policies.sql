-- ============================================================
-- Trustloop — storage exact-path policies
--
-- Summary: replaces the 6 storage.objects policies for the
-- "documents" and "questionnaires" buckets. The old check only
-- required the FIRST path segment to equal the caller's uid
-- (storage.foldername(name))[1] = auth.uid()), which allowed
-- extra nested segments. The new check requires the whole folder
-- path to be exactly <uid>, i.e. files live at
-- <uid>/<filename> with no deeper nesting — which is what the app
-- writes. Each policy keeps its existing name, command, role and
-- bucket, so this is a drop-and-recreate of the same 6 policies.
-- No data rows are touched; the buckets stay private.
-- ============================================================

-- documents bucket
drop policy if exists "documents_insert_own" on storage.objects;
create policy "documents_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and storage.foldername(name) = array[auth.uid()::text]
  );

drop policy if exists "documents_select_own" on storage.objects;
create policy "documents_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and storage.foldername(name) = array[auth.uid()::text]
  );

drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and storage.foldername(name) = array[auth.uid()::text]
  );

-- questionnaires bucket
drop policy if exists "questionnaires_insert_own" on storage.objects;
create policy "questionnaires_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'questionnaires'
    and storage.foldername(name) = array[auth.uid()::text]
  );

drop policy if exists "questionnaires_select_own" on storage.objects;
create policy "questionnaires_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'questionnaires'
    and storage.foldername(name) = array[auth.uid()::text]
  );

drop policy if exists "questionnaires_delete_own" on storage.objects;
create policy "questionnaires_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'questionnaires'
    and storage.foldername(name) = array[auth.uid()::text]
  );
