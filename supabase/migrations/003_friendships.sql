-- ============================================================================
-- 003: friendships
-- Wishlists, birthdays and claims become visible only to accepted friends.
-- Run once in Supabase → SQL Editor. (schema.sql includes this for fresh setups.)
-- ============================================================================

-- Email, synced from Clerk on sign-in, so people can find each other by
-- exact email address. It is never returned by find_people.
alter table public.profiles add column if not exists email text;
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- One row per pair of people. The requester sends, the addressee accepts.
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

alter table public.friendships enable row level security;
revoke all on public.friendships from anon;
grant select, insert, delete on public.friendships to authenticated;
-- Accepting only touches these columns, so nobody can rewrite who is in a friendship.
grant update (status, responded_at) on public.friendships to authenticated;

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

-- profiles: yourself, your friends, and people you have a pending request with.
drop policy if exists "Signed-in users can see everyone" on public.profiles;
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

-- wishlist_items: your own list and your friends' lists.
drop policy if exists "Signed-in users can see all wishlists" on public.wishlist_items;
create policy "Users see their own and their friends' wishlists"
  on public.wishlist_items for select to authenticated
  using (owner_id = public.current_user_id() or public.is_friend(owner_id));

-- claims: the item must be visible to you (so it's a friend's item, given the
-- policy above) and not your own. Still hidden from the wishlist owner.
drop policy if exists "Claims are visible to everyone except the item owner" on public.claims;
create policy "Claims on friends' items are visible, never to the owner"
  on public.claims for select to authenticated
  using (
    exists (
      select 1 from public.wishlist_items i
      where i.id = claims.item_id
        and i.owner_id <> public.current_user_id()
    )
  );

drop policy if exists "Users can claim other people's items" on public.claims;
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
