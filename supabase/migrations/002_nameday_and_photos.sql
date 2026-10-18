-- ============================================================================
-- 002: name days + wish photos
-- Run once in Supabase → SQL Editor on a database that already has schema.sql.
-- (schema.sql includes these changes for fresh setups.)
-- ============================================================================

-- Name day: only day and month matter; the year is stored as 2000.
alter table public.profiles add column if not exists nameday date;

-- Public bucket for wish photos. Files are readable by URL; only the
-- uploader can add or remove files, and only inside their own folder
-- ("<clerk user id>/<file>").
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-photos', 'wish-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users can upload wish photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'wish-photos'
    and (storage.foldername(name))[1] = public.current_user_id()
  );

create policy "Users can see their own wish photo files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'wish-photos'
    and (storage.foldername(name))[1] = public.current_user_id()
  );

create policy "Users can delete their own wish photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'wish-photos'
    and (storage.foldername(name))[1] = public.current_user_id()
  );
