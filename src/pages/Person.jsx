import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Gift, UserMinus, UserX } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import Occasions from '../components/Occasions.jsx'
import ItemCard from '../components/ItemCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { PageLoader } from '../components/AppLayout.jsx'
import { useSupabase } from '../lib/supabase.jsx'
import { useProfile } from '../lib/profile.jsx'
import { useToast, errorMessage } from '../lib/toast.jsx'
import { useFriends } from '../lib/friends.jsx'
import { claimItem, getProfile, listItems, releaseClaim, removeFriendship } from '../lib/api.js'
import { firstName } from '../lib/format.js'

export default function Person() {
  const { personId } = useParams()
  const sb = useSupabase()
  const toast = useToast()
  const navigate = useNavigate()
  const { profile: me } = useProfile()
  const {
    friends = [],
    incoming = [],
    outgoing = [],
    loading: friendsLoading,
    refresh: refreshFriends,
  } = useFriends()
  const friendship = friends.find((f) => f.person.id === personId)
  const [person, setPerson] = useState(undefined) // undefined = loading, null = not visible
  const [items, setItems] = useState(null)

  const loadItems = useCallback(async () => {
    try {
      setItems(await listItems(sb, personId))
    } catch (err) {
      toast(errorMessage(err), 'error')
      setItems([])
    }
  }, [sb, personId, toast])

  useEffect(() => {
    if (personId === me.id) return
    getProfile(sb, personId)
      .then(setPerson)
      .catch(() => setPerson(null))
    loadItems()
  }, [sb, personId, me.id, loadItems])

  // Looking at your own list from here would spoil the surprise.
  if (personId === me.id) return <Navigate to="/app/wishlist" replace />

  async function handleClaim(item) {
    try {
      await claimItem(sb, item.id)
      toast(`Nice! You’re getting “${item.title}”`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
    loadItems()
  }

  async function handleRelease(item) {
    try {
      await releaseClaim(sb, item.id)
      toast('Claim removed. Someone else can pick it now.')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
    loadItems()
  }

  async function handleUnfriend() {
    if (!window.confirm(`Remove ${person.full_name} from your friends? You won’t see each other’s wishlists.`)) {
      return
    }
    try {
      await removeFriendship(sb, friendship.id)
      await refreshFriends()
      toast(`${firstName(person.full_name)} was removed from your friends`)
      navigate('/app/friends', { replace: true })
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  if (person === undefined || friendsLoading) return <PageLoader />

  // Wishlists are only visible between accepted friends (enforced by the database too).
  if (!friendship) {
    const pendingIn = incoming.some((r) => r.person.id === personId)
    const pendingOut = outgoing.some((r) => r.person.id === personId)
    return (
      <EmptyState
        icon={UserX}
        title={person ? `You and ${firstName(person.full_name)} aren’t friends yet` : 'You can’t see this wishlist'}
        action={
          <Link to={pendingIn ? '/app/friends?tab=requests' : '/app/friends?tab=find'} className="btn btn--primary">
            {pendingIn ? 'See their request' : 'Find people'}
          </Link>
        }
      >
        {pendingOut
          ? 'Your friend request is waiting for them to accept.'
          : 'Wishlists are only visible to friends. Send a friend request, and once it’s accepted you’ll see each other’s lists.'}
      </EmptyState>
    )
  }

  const name = firstName(person.full_name)
  const available = items?.filter((i) => !i.claim).length ?? 0

  return (
    <>
      <div className="back-row">
        <Link to="/app/friends" className="back-link">
          <ArrowLeft size={16} /> All friends
        </Link>
        <button className="btn btn--ghost btn--sm btn--danger" onClick={handleUnfriend}>
          <UserMinus size={15} /> Remove friend
        </button>
      </div>

      <section className="page-head">
        <div className="page-head__person">
          <Avatar person={person} size={64} />
          <div>
            <p className="eyebrow">Wishlist</p>
            <h1 className="page-title">{person.full_name}</h1>
            <p className="page-sub">
              {(person.birthday || person.nameday) && (
                <>
                  <Occasions person={person} iconSize={15} />
                  <span className="dot">·</span>
                </>
              )}
              {items ? `${available} of ${items.length} still available` : 'Loading…'}
            </p>
          </div>
        </div>
      </section>

      {person.bio && <p className="bio">“{person.bio}”</p>}

      {items === null ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={Gift} title={`${name} hasn’t added any wishes yet`}>
          Give them a nudge. A gift card is always a safe bet in the meantime.
        </EmptyState>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              mode="friend"
              currentUserId={me.id}
              onClaim={handleClaim}
              onRelease={handleRelease}
            />
          ))}
        </div>
      )}
    </>
  )
}
