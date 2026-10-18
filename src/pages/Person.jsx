import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Gift, UserX } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import Occasions from '../components/Occasions.jsx'
import ItemCard from '../components/ItemCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { PageLoader } from '../components/AppLayout.jsx'
import { useSupabase } from '../lib/supabase.jsx'
import { useProfile } from '../lib/profile.jsx'
import { useToast, errorMessage } from '../lib/toast.jsx'
import { claimItem, getProfile, listItems, releaseClaim } from '../lib/api.js'
import { firstName } from '../lib/format.js'

export default function Person() {
  const { personId } = useParams()
  const sb = useSupabase()
  const toast = useToast()
  const { profile: me } = useProfile()
  const [person, setPerson] = useState(undefined) // undefined = loading, null = not found
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

  if (person === undefined) return <PageLoader />
  if (person === null) {
    return (
      <EmptyState
        icon={UserX}
        title="We couldn’t find this person"
        action={
          <Link to="/app/people" className="btn btn--ghost">
            <ArrowLeft size={16} /> Back to people
          </Link>
        }
      />
    )
  }

  const name = firstName(person.full_name)
  const available = items?.filter((i) => !i.claim).length ?? 0

  return (
    <>
      <Link to="/app/people" className="back-link">
        <ArrowLeft size={16} /> All people
      </Link>

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
