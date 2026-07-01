-- LICENA — storage for support-chat screenshots.
--
-- A PRIVATE bucket the support widget uploads user screenshots into (signed-in users
-- only). The chat sends the model a time-limited signed URL so it can "see" the
-- screenshot, and the same URL is attached to any ticket the chat logs so the team can
-- review it. Files are namespaced per user:  support-uploads/<auth.uid()>/<uuid>.jpg
--
-- Run once in the Supabase SQL editor (Dashboard → SQL) after deploying the assistant
-- function. Idempotent — safe to re-run.

-- 1) Private bucket, capped to small images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-uploads', 'support-uploads', false, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS: a signed-in user may write into, and read/sign, only their OWN folder.
--    (createSignedUrl needs SELECT on the object; the uploader owns its folder.)
drop policy if exists "support-uploads: insert own" on storage.objects;
drop policy if exists "support-uploads: read own"   on storage.objects;

create policy "support-uploads: insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'support-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "support-uploads: read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'support-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
