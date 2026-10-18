-- ============================================================================
-- Wishly database schema
-- Run this once in Supabase → SQL Editor → New query → Run.
--
-- Auth is handled by Clerk (Supabase "Third-Party Auth"). Every request from
-- the app carries a Clerk session token; its `sub` claim is the Clerk user id
-- (e.g. "user_2abc..."), which we use as the primary key for people.
-- ============================================================================

-- Helper: the Clerk user id of whoever is making the request.
create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')
$$;

-- Keep updated_at fresh on every update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles: one row per person (synced from Clerk on sign-in)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          text primary key default public.current_user_id(),
  full_name   text not null default '',
  avatar_url  text,
  birthday    date,
  nameday     date, -- only day and month matter; year is stored as 2000
  bio        text check (char_length(bio) <= 280),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- wishlist_items: things a person would love to receive
-- ----------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null default public.current_user_id(),
  title       text not null check (char_length(title) between 1 and 200),
  url         text,
  image_url   text,
  price       numeric(10, 2) check (price >= 0),
  currency    text not null default 'EUR',
  notes       text check (char_length(notes) <= 1000),
  priority    smallint not null default 2 check (priority between 1 and 3),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint wishlist_items_owner_id_fkey
    foreign key (owner_id) references public.profiles (id) on delete cascade
);

create index if not exists wishlist_items_owner_id_idx on public.wishlist_items (owner_id);

create trigger wishlist_items_touch_updated_at
  before update on public.wishlist_items
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- claims: "I'll buy it". One claim per item (item_id is the primary key).
-- ----------------------------------------------------------------------------
create table if not exists public.claims (
  item_id     uuid primary key,
  claimer_id  text not null default public.current_user_id(),
  created_at  timestamptz not null default now(),
  constraint claims_item_id_fkey
    foreign key (item_id) references public.wishlist_items (id) on delete cascade,
  constraint claims_claimer_id_fkey
    foreign key (claimer_id) references public.profiles (id) on delete cascade
);

create index if not exists claims_claimer_id_idx on public.claims (claimer_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.claims         enable row level security;

-- Only signed-in users can use the API; anonymous visitors get nothing.
revoke all on public.profiles, public.wishlist_items, public.claims from anon;
grant select, insert, update         on public.profiles       to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select, insert, delete         on public.claims         to authenticated;

-- profiles ------------------------------------------------------------------
create policy "Signed-in users can see everyone"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = public.current_user_id());

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

-- wishlist_items ------------------------------------------------------------
create policy "Signed-in users can see all wishlists"
  on public.wishlist_items for select to authenticated
  using (true);

create policy "Users can add to their own wishlist"
  on public.wishlist_items for insert to authenticated
  with check (owner_id = public.current_user_id());

create policy "Users can edit their own wishlist"
  on public.wishlist_items for update to authenticated
  using (owner_id = public.current_user_id())
  with check (owner_id = public.current_user_id());

create policy "Users can remove from their own wishlist"
  on public.wishlist_items for delete to authenticated
  using (owner_id = public.current_user_id());

-- claims --------------------------------------------------------------------
-- Keep the surprise: the wishlist owner can never see claims on their own items.
create policy "Claims are visible to everyone except the item owner"
  on public.claims for select to authenticated
  using (
    not exists (
      select 1 from public.wishlist_items i
      where i.id = claims.item_id
        and i.owner_id = public.current_user_id()
    )
  );

create policy "Users can claim other people's items"
  on public.claims for insert to authenticated
  with check (
    claimer_id = public.current_user_id()
    and not exists (
      select 1 from public.wishlist_items i
      where i.id = claims.item_id
        and i.owner_id = public.current_user_id()
    )
  );

create policy "Users can release their own claims"
  on public.claims for delete to authenticated
  using (claimer_id = public.current_user_id());

-- ============================================================================
-- Storage: wish photos
-- Public bucket (files readable by URL). Uploads and deletes are limited to
-- the uploader's own folder: "<clerk user id>/<file>".
-- ============================================================================
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
