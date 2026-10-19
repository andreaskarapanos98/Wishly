// All database access lives here. Every function takes the Supabase client
// from useSupabase(). Row Level Security (see supabase/schema.sql) decides
// what each user can read and write; these helpers just shape the queries.

const PERSON_FIELDS = 'id, full_name, avatar_url, birthday, nameday, bio'

// The explicit "!constraint_name" hints tell PostgREST exactly which foreign
// key to follow, since profiles is linked to items both directly and via claims.
const ITEM_WITH_CLAIM = `
  *,
  claim:claims!claims_item_id_fkey (
    claimer_id,
    created_at,
    claimer:profiles!claims_claimer_id_fkey ( id, full_name, avatar_url )
  )
`

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

// A one-to-one embed can come back as an object or a one-element array.
function normalizeClaim(item) {
  const claim = Array.isArray(item.claim) ? item.claim[0] ?? null : item.claim ?? null
  return { ...item, claim }
}

// ---------------------------------------------------------------- profiles

export async function syncProfile(sb, { id, full_name, avatar_url, email }) {
  // Upsert only touches the columns we send, so birthday and bio are kept.
  return unwrap(
    await sb
      .from('profiles')
      .upsert({ id, full_name, avatar_url, email }, { onConflict: 'id' })
      .select(PERSON_FIELDS)
      .single(),
  )
}

export async function getProfile(sb, id) {
  return unwrap(await sb.from('profiles').select(PERSON_FIELDS).eq('id', id).maybeSingle())
}

export async function updateProfile(sb, id, changes) {
  return unwrap(
    await sb.from('profiles').update(changes).eq('id', id).select(PERSON_FIELDS).single(),
  )
}

// ---------------------------------------------------------------- friends

const FRIEND_FIELDS = `${PERSON_FIELDS}, items:wishlist_items!wishlist_items_owner_id_fkey(count)`

/**
 * All of the current user's friendships, split into accepted friends,
 * incoming requests and outgoing requests. Each entry has `person` (the
 * other side) and the friendship `id`.
 */
export async function listFriendships(sb, userId) {
  const rows = unwrap(
    await sb
      .from('friendships')
      .select(
        `id, status, requester_id, addressee_id, created_at,
         requester:profiles!friendships_requester_id_fkey ( ${FRIEND_FIELDS} ),
         addressee:profiles!friendships_addressee_id_fkey ( ${FRIEND_FIELDS} )`,
      )
      .order('created_at', { ascending: false }),
  )

  const result = { friends: [], incoming: [], outgoing: [] }
  for (const row of rows) {
    const other = row.requester_id === userId ? row.addressee : row.requester
    if (!other) continue
    const { items, ...person } = other
    const entry = { id: row.id, person: { ...person, itemCount: items?.[0]?.count ?? 0 } }
    if (row.status === 'accepted') result.friends.push(entry)
    else if (row.addressee_id === userId) result.incoming.push(entry)
    else result.outgoing.push(entry)
  }
  return result
}

/** Everyone except me (name + photo only) with status: none / sent / received / friends. */
export async function findPeople(sb, search = '') {
  return unwrap(await sb.rpc('find_people', { search: search.trim() }))
}

export async function sendFriendRequest(sb, personId) {
  const { error } = await sb.from('friendships').insert({ addressee_id: personId })
  if (error?.code === '23505') {
    throw new Error('You already have a friend request with this person.')
  }
  if (error) throw error
}

export async function acceptFriendRequest(sb, friendshipId) {
  unwrap(
    await sb
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', friendshipId),
  )
}

/** Declines, cancels or unfriends, depending on the friendship's state. */
export async function removeFriendship(sb, friendshipId) {
  unwrap(await sb.from('friendships').delete().eq('id', friendshipId))
}

/** Removes the friendship (or request) between the current user and a person. */
export async function removeFriendshipWith(sb, userId, personId) {
  unwrap(
    await sb
      .from('friendships')
      .delete()
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${personId}),` +
          `and(requester_id.eq.${personId},addressee_id.eq.${userId})`,
      ),
  )
}

// ---------------------------------------------------------------- items

export async function listItems(sb, ownerId) {
  const rows = unwrap(
    await sb
      .from('wishlist_items')
      .select(ITEM_WITH_CLAIM)
      .eq('owner_id', ownerId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
  )
  return rows.map(normalizeClaim)
}

export async function createItem(sb, item) {
  return unwrap(await sb.from('wishlist_items').insert(item).select('*').single())
}

export async function updateItem(sb, id, changes) {
  return unwrap(await sb.from('wishlist_items').update(changes).eq('id', id).select('*').single())
}

export async function deleteItem(sb, id) {
  unwrap(await sb.from('wishlist_items').delete().eq('id', id))
}

// ---------------------------------------------------------------- claims

export async function claimItem(sb, itemId) {
  const { error } = await sb.from('claims').insert({ item_id: itemId })
  if (error?.code === '23505') {
    throw new Error('Someone else just claimed this gift.')
  }
  if (error) throw error
}

export async function releaseClaim(sb, itemId) {
  unwrap(await sb.from('claims').delete().eq('item_id', itemId))
}

export async function listMyClaims(sb, userId) {
  return unwrap(
    await sb
      .from('claims')
      .select(
        `created_at,
         item:wishlist_items!claims_item_id_fkey (
           *,
           owner:profiles!wishlist_items_owner_id_fkey ( ${PERSON_FIELDS} )
         )`,
      )
      .eq('claimer_id', userId)
      .order('created_at', { ascending: false }),
  )
}
