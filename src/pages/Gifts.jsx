import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, ExternalLink } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import Occasions from '../components/Occasions.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { PageLoader } from '../components/AppLayout.jsx'
import { useSupabase } from '../lib/supabase.jsx'
import { useProfile } from '../lib/profile.jsx'
import { useToast, errorMessage } from '../lib/toast.jsx'
import { listMyClaims, releaseClaim } from '../lib/api.js'
import { formatPrice, hostname } from '../lib/format.js'

export default function Gifts() {
  const sb = useSupabase()
  const toast = useToast()
  const { profile } = useProfile()
  const [claims, setClaims] = useState(null)

  const load = useCallback(async () => {
    try {
      setClaims(await listMyClaims(sb, profile.id))
    } catch (err) {
      toast(errorMessage(err), 'error')
      setClaims([])
    }
  }, [sb, profile.id, toast])

  useEffect(() => {
    load()
  }, [load])

  async function handleRelease(item) {
    try {
      await releaseClaim(sb, item.id)
      setClaims((list) => list.filter((c) => c.item.id !== item.id))
      toast('Claim removed')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const total = claims?.reduce((sum, c) => sum + (Number(c.item.price) || 0), 0) ?? 0
  const currency = claims?.[0]?.item.currency ?? 'EUR'

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Gifts I’m buying</p>
          <h1 className="page-title">Your shopping list</h1>
          <p className="page-sub">
            Everything you’ve claimed, in one place.
            {total > 0 && <> Roughly {formatPrice(total, currency)} in total.</>}
          </p>
        </div>
      </section>

      {claims === null ? (
        <PageLoader />
      ) : claims.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="You haven’t claimed any gifts yet"
          action={
            <Link to="/app/friends" className="btn btn--primary">
              See your friends
            </Link>
          }
        >
          When you tap “I’ll buy it” on a friend’s wish, it shows up here.
        </EmptyState>
      ) : (
        <ul className="gift-list">
          {claims.map(({ item }) => (
            <li key={item.id} className="gift-row">
              <Link to={`/app/friends/${item.owner.id}`} className="gift-row__person">
                <Avatar person={item.owner} size={44} />
              </Link>
              <div className="gift-row__body">
                <h3 className="gift-row__title">{item.title}</h3>
                <p className="gift-row__meta">
                  For <Link to={`/app/friends/${item.owner.id}`}>{item.owner.full_name}</Link>
                  {(item.owner.birthday || item.owner.nameday) && (
                    <>
                      <span className="dot">·</span>
                      <Occasions person={item.owner} iconSize={13} />
                    </>
                  )}
                </p>
              </div>
              <div className="gift-row__side">
                {formatPrice(item.price, item.currency) && (
                  <span className="item__price">{formatPrice(item.price, item.currency)}</span>
                )}
                {item.url && (
                  <a className="btn btn--ghost btn--sm" href={item.url} target="_blank" rel="noreferrer noopener">
                    {hostname(item.url) ?? 'Open'} <ExternalLink size={13} />
                  </a>
                )}
                <button className="btn btn--link btn--sm" onClick={() => handleRelease(item)}>
                  Unclaim
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
