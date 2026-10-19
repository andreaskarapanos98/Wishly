import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  Users,
  ChevronRight,
  UserPlus,
  UserCheck,
  Check,
  X,
  Clock,
  Inbox,
  Link2,
  Loader2,
} from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import Occasions from '../components/Occasions.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { PageLoader } from '../components/AppLayout.jsx'
import { useSupabase } from '../lib/supabase.jsx'
import { useFriends } from '../lib/friends.jsx'
import { useToast, errorMessage } from '../lib/toast.jsx'
import {
  acceptFriendRequest,
  findPeople,
  removeFriendship,
  sendFriendRequest,
} from '../lib/api.js'
import { daysUntilNextOccasion, firstName } from '../lib/format.js'

const TABS = [
  { id: 'friends', label: 'My friends' },
  { id: 'requests', label: 'Requests' },
  { id: 'find', label: 'Find people' },
]

export default function Friends() {
  const [params, setParams] = useSearchParams()
  const { friends, incoming, outgoing, loading } = useFriends()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'friends'

  const counts = {
    friends: friends?.length,
    requests: incoming?.length || null,
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Friends</p>
          <h1 className="page-title">Your circle</h1>
          <p className="page-sub">Only friends can see each other’s wishlists and birthdays.</p>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tabs__tab ${tab === t.id ? 'tabs__tab--active' : ''}`}
            onClick={() => setParams(t.id === 'friends' ? {} : { tab: t.id }, { replace: true })}
          >
            {t.label}
            {counts[t.id] ? (
              <span className={`tabs__count ${t.id === 'requests' ? 'tabs__count--alert' : ''}`}>
                {counts[t.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : tab === 'friends' ? (
        <FriendsTab friends={friends} onFind={() => setParams({ tab: 'find' })} />
      ) : tab === 'requests' ? (
        <RequestsTab incoming={incoming} outgoing={outgoing} onFind={() => setParams({ tab: 'find' })} />
      ) : (
        <FindTab />
      )}
    </>
  )
}

// ------------------------------------------------------------------ friends

function FriendsTab({ friends, onFind }) {
  const [query, setQuery] = useState('')

  // Upcoming birthdays / name days first, then alphabetical.
  const visible = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return friends
      .map((f) => f.person)
      .filter((p) => words.every((w) => p.full_name.toLowerCase().includes(w)))
      .sort((a, b) => {
        const da = daysUntilNextOccasion(a) ?? 999
        const db = daysUntilNextOccasion(b) ?? 999
        return da - db || a.full_name.localeCompare(b.full_name)
      })
  }, [friends, query])

  if (friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No friends yet"
        action={
          <button className="btn btn--primary" onClick={onFind}>
            <UserPlus size={17} /> Find people
          </button>
        }
      >
        Add friends to see their wishlists. They’ll see yours once they accept.
      </EmptyState>
    )
  }

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            className="search__input"
            placeholder="Search your friends"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={Search} title="No friend matches that name" />
      ) : (
        <div className="people-grid">
          {visible.map((person) => (
            <Link key={person.id} to={`/app/friends/${person.id}`} className="person-card">
              <Avatar person={person} size={52} />
              <div className="person-card__body">
                <h3 className="person-card__name">{person.full_name || 'Unnamed friend'}</h3>
                <p className="person-card__meta">
                  {person.itemCount} {person.itemCount === 1 ? 'wish' : 'wishes'}
                </p>
                <Occasions person={person} variant="chips" />
              </div>
              <ChevronRight className="person-card__chevron" size={18} />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------ requests

function RequestsTab({ incoming, outgoing, onFind }) {
  const sb = useSupabase()
  const toast = useToast()
  const { refresh } = useFriends()

  async function run(action, message) {
    try {
      await action()
      toast(message)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
    await refresh()
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No requests right now"
        action={
          <button className="btn btn--primary" onClick={onFind}>
            <UserPlus size={17} /> Find people
          </button>
        }
      >
        When someone adds you, their request shows up here.
      </EmptyState>
    )
  }

  return (
    <div className="stack">
      {incoming.length > 0 && (
        <section>
          <h2 className="section-label">Waiting for you</h2>
          <ul className="row-list">
            {incoming.map(({ id, person }) => (
              <PersonRow key={id} person={person} note="Wants to be friends">
                <AsyncButton
                  className="btn btn--primary btn--sm"
                  onClick={() =>
                    run(
                      () => acceptFriendRequest(sb, id),
                      `You and ${firstName(person.full_name)} are now friends`,
                    )
                  }
                >
                  <Check size={15} /> Accept
                </AsyncButton>
                <AsyncButton
                  className="btn btn--ghost btn--sm"
                  onClick={() => run(() => removeFriendship(sb, id), 'Request declined')}
                >
                  <X size={15} /> Decline
                </AsyncButton>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="section-label">Sent by you</h2>
          <ul className="row-list">
            {outgoing.map(({ id, person }) => (
              <PersonRow key={id} person={person} note="Waiting for them to accept">
                <AsyncButton
                  className="btn btn--ghost btn--sm"
                  onClick={() => run(() => removeFriendship(sb, id), 'Request cancelled')}
                >
                  Cancel request
                </AsyncButton>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ find

function FindTab() {
  const sb = useSupabase()
  const toast = useToast()
  const { incoming, outgoing, refresh } = useFriends()
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState(null)

  // Search as you type, slightly debounced. Re-runs when requests change.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      findPeople(sb, query)
        .then((rows) => !cancelled && setPeople(rows))
        .catch((err) => !cancelled && toast(errorMessage(err), 'error'))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sb, query, toast, incoming, outgoing])

  async function run(action, message) {
    try {
      await action()
      toast(message)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
    await refresh()
  }

  function requestId(personId, list) {
    return list.find((r) => r.person.id === personId)?.id
  }

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            className="search__input"
            placeholder="Name, surname or exact email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>
        <InviteButton />
      </div>

      {people === null ? (
        <PageLoader />
      ) : people.length === 0 ? (
        <EmptyState icon={Search} title={query ? 'Nobody by that name yet' : 'No one else is here yet'}>
          Invite your friends with the link. Once they sign up, you can add them.
        </EmptyState>
      ) : (
        <ul className="row-list">
          {people.map((person) => (
            <PersonRow key={person.id} person={person}>
              {person.status === 'friends' && (
                <Link to={`/app/friends/${person.id}`} className="btn btn--ghost btn--sm">
                  <UserCheck size={15} /> Friends
                </Link>
              )}
              {person.status === 'sent' && (
                <AsyncButton
                  className="btn btn--ghost btn--sm"
                  title="Cancel request"
                  onClick={() =>
                    run(() => removeFriendship(sb, requestId(person.id, outgoing)), 'Request cancelled')
                  }
                >
                  <Clock size={15} /> Requested
                </AsyncButton>
              )}
              {person.status === 'received' && (
                <AsyncButton
                  className="btn btn--primary btn--sm"
                  onClick={() =>
                    run(
                      () => acceptFriendRequest(sb, requestId(person.id, incoming)),
                      `You and ${firstName(person.full_name)} are now friends`,
                    )
                  }
                >
                  <Check size={15} /> Accept request
                </AsyncButton>
              )}
              {person.status === 'none' && (
                <AsyncButton
                  className="btn btn--primary btn--sm"
                  onClick={() =>
                    run(
                      () => sendFriendRequest(sb, person.id),
                      `Friend request sent to ${firstName(person.full_name)}`,
                    )
                  }
                >
                  <UserPlus size={15} /> Add friend
                </AsyncButton>
              )}
            </PersonRow>
          ))}
        </ul>
      )}
    </>
  )
}

// ------------------------------------------------------------------ bits

function PersonRow({ person, note, children }) {
  return (
    <li className="person-row">
      <Avatar person={person} size={44} />
      <div className="person-row__body">
        <h3 className="person-row__name">{person.full_name || 'Unnamed'}</h3>
        {note && <p className="person-row__note">{note}</p>}
      </div>
      <div className="person-row__actions">{children}</div>
    </li>
  )
}

function AsyncButton({ onClick, children, ...props }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      {...props}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await onClick()
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? <Loader2 className="spin" size={15} /> : null}
      {children}
    </button>
  )
}

function InviteButton() {
  const toast = useToast()
  const link = new URL(import.meta.env.BASE_URL, window.location.origin).href

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Wishly', text: 'Join me on Wishly!', url: link })
        return
      }
      await navigator.clipboard.writeText(link)
      toast('Invite link copied')
    } catch (err) {
      if (err?.name !== 'AbortError') toast('Couldn’t copy the link', 'error')
    }
  }

  return (
    <button className="btn btn--outline" onClick={share}>
      <Link2 size={16} /> Invite friends
    </button>
  )
}
