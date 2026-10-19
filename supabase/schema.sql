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
  email       text, -- synced from Clerk; used only for exact-match search
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
create index if not exists profiles_email_idx on public.profiles (lower(email));

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

-- ----------------------------------------------------------------------------
-- friendships: one row per pair. The requester sends, the addressee accepts.
-- Wishlists, birthdays and claims are only visible between accepted friends.
-- ----------------------------------------------------------------------------
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  text not null default public.current_user_id(),
  addressee_id  text not null,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint friendships_requester_id_fkey
    foreign key (requester_id) references public.profiles (id) on delete cascade,
  constraint friendships_addressee_id_fkey
    foreign key (addressee_id) references public.profiles (id) on delete cascade,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- Only one friendship (or request) per pair, whichever direction it was sent.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

-- True when the current user and `other` are accepted friends.
create or replace function public.is_friend(other text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = public.current_user_id() and f.addressee_id = other)
        or (f.addressee_id = public.current_user_id() and f.requester_id = other)
      )
  )
$$;

-- "Find people": everyone's name and photo (nothing else), plus how they
-- relate to the current user: none / sent / received / friends.
-- Matches when every word is part of the name ("andreas k", "karapanos"),
-- or when the search is someone's exact email address. Emails are never returned.
create or replace function public.find_people(search text default '')
returns table (id text, full_name text, avatar_url text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    case
      when f.status = 'accepted' then 'friends'
      when f.requester_id = public.current_user_id() then 'sent'
      when f.addressee_id = public.current_user_id() then 'received'
      else 'none'
    end
  from public.profiles p
  left join public.friendships f
    on (f.requester_id = p.id and f.addressee_id = public.current_user_id())
    or (f.addressee_id = p.id and f.requester_id = public.current_user_id())
  where public.current_user_id() is not null
    and p.id <> public.current_user_id()
    and (
      coalesce(trim(search), '') = ''
      or lower(p.email) = lower(trim(search))
      or not exists (
        select 1 from unnest(regexp_split_to_array(trim(search), '\s+')) as word
        where p.full_name not ilike '%' || word || '%'
      )
    )
  order by p.full_name
  limit 50
$$;

revoke execute on function public.is_friend(text) from public, anon;
revoke execute on function public.find_people(text) from public, anon;
grant execute on function public.is_friend(text) to authenticated;
grant execute on function public.find_people(text) to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.claims         enable row level security;
alter table public.friendships    enable row level security;

-- Only signed-in users can use the API; anonymous visitors get nothing.
revoke all on public.profiles, public.wishlist_items, public.claims, public.friendships from anon;
grant select, insert, update         on public.profiles       to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select, insert, delete         on public.claims         to authenticated;
grant select, insert, delete         on public.friendships    to authenticated;
-- Accepting only touches these columns, so nobody can rewrite who is in a friendship.
grant update (status, responded_at)  on public.friendships    to authenticated;

-- friendships ---------------------------------------------------------------
create policy "Users see their own friendships and requests"
  on public.friendships for select to authenticated
  using (public.current_user_id() in (requester_id, addressee_id));

create policy "Users can send friend requests"
  on public.friendships for insert to authenticated
  with check (requester_id = public.current_user_id() and status = 'pending');

create policy "Only the person asked can accept a request"
  on public.friendships for update to authenticated
  using (addressee_id = public.current_user_id())
  with check (addressee_id = public.current_user_id() and status = 'accepted');

create policy "Either person can decline, cancel or unfriend"
  on public.friendships for delete to authenticated
  using (public.current_user_id() in (requester_id, addressee_id));

-- profiles ------------------------------------------------------------------
-- Yourself, your friends, and people you have a pending request with.
-- (Everyone else is only findable by name and photo through find_people.)
create policy "Users see themselves, friends and pending requests"
  on public.profiles for select to authenticated
  using (
    id = public.current_user_id()
    or exists (
      select 1 from public.friendships f
      where (f.requester_id = public.current_user_id() and f.addressee_id = profiles.id)
         or (f.addressee_id = public.current_user_id() and f.requester_id = profiles.id)
    )
  );

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = public.current_user_id());

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

-- wishlist_items ------------------------------------------------------------
create policy "Users see their own and their friends' wishlists"
  on public.wishlist_items for select to authenticated
  using (owner_id = public.current_user_id() or public.is_friend(owner_id));

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
-- Claims are anonymous: you only ever see your own claim rows. Friends learn
-- that an item is taken through claimed_items() below, never who took it.
create policy "Users see only their own claims"
  on public.claims for select to authenticated
  using (
    claimer_id = public.current_user_id()
    and exists (
      select 1 from public.wishlist_items i
      where i.id = claims.item_id
        and i.owner_id <> public.current_user_id()
    )
  );

create policy "Users can claim their friends' items"
  on public.claims for insert to authenticated
  with check (
    claimer_id = public.current_user_id()
    and exists (
      select 1 from public.wishlist_items i
      where i.id = claims.item_id
        and i.owner_id <> public.current_user_id()
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

-- ============================================================================
-- Which of a friend's items are taken, without saying by whom.
-- Returns nothing for your own list (keeps the surprise) or for non-friends.
-- ============================================================================
create or replace function public.claimed_items(person text)
returns table (item_id uuid, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.item_id, c.claimer_id = public.current_user_id()
  from public.claims c
  join public.wishlist_items i on i.id = c.item_id
  where i.owner_id = person
    and person <> public.current_user_id()
    and public.is_friend(person)
$$;

revoke execute on function public.claimed_items(text) from public, anon;
grant execute on function public.claimed_items(text) to authenticated;
