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

export async function syncProfile(sb, { id, full_name, avatar_url }) {
  // Upsert only touches the columns we send, so birthday and bio are kept.
  return unwrap(
    await sb
      .from('profiles')
      .upsert({ id, full_name, avatar_url }, { onConflict: 'id' })
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

export async function listPeople(sb) {
  const rows = unwrap(
    await sb
      .from('profiles')
      .select(`${PERSON_FIELDS}, items:wishlist_items!wishlist_items_owner_id_fkey(count)`)
      .order('full_name'),
  )
  return rows.map(({ items, ...person }) => ({ ...person, itemCount: items?.[0]?.count ?? 0 }))
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
