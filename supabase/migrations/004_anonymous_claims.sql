-- ============================================================================
-- 004: anonymous claims
-- Nobody can see who is buying a gift. Friends only learn that an item is
-- taken (and whether they took it themselves); claimer ids are never exposed.
-- Run once in Supabase → SQL Editor. (schema.sql includes this for fresh setups.)
-- ============================================================================

-- The claims table itself now only shows you your own claims.
drop policy if exists "Claims on friends' items are visible, never to the owner" on public.claims;
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

-- Which of a friend's items are taken, without saying by whom.
-- Returns nothing for your own list (keeps the surprise) or for non-friends.
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
