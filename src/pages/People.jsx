import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, CalendarHeart, ChevronRight } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { PageLoader } from '../components/AppLayout.jsx'
import { useSupabase } from '../lib/supabase.jsx'
import { useProfile } from '../lib/profile.jsx'
import { useToast, errorMessage } from '../lib/toast.jsx'
import { listPeople } from '../lib/api.js'
import { birthdayLabel, daysUntilBirthday } from '../lib/format.js'

export default function People() {
  const sb = useSupabase()
  const toast = useToast()
  const { profile } = useProfile()
  const [people, setPeople] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listPeople(sb)
      .then(setPeople)
      .catch((err) => {
        toast(errorMessage(err), 'error')
        setPeople([])
      })
  }, [sb, toast])

  // Everyone except me, upcoming birthdays first, then alphabetical.
  const visible = useMemo(() => {
    if (!people) return null
    const q = query.trim().toLowerCase()
    return people
      .filter((p) => p.id !== profile.id)
      .filter((p) => !q || p.full_name.toLowerCase().includes(q))
      .sort((a, b) => {
        const da = daysUntilBirthday(a.birthday) ?? 999
        const db = daysUntilBirthday(b.birthday) ?? 999
        return da - db || a.full_name.localeCompare(b.full_name)
      })
  }, [people, query, profile.id])

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">People</p>
          <h1 className="page-title">Your circle</h1>
          <p className="page-sub">Upcoming birthdays first. Tap someone to see their wishlist.</p>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            className="search__input"
            placeholder="Search friends"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </section>

      {visible === null ? (
        <PageLoader />
      ) : visible.length === 0 ? (
        <EmptyState icon={Users} title={query ? 'No one matches that search' : 'It’s quiet in here'}>
          {query
            ? 'Try a different name.'
            : 'Share the Wishly link with your friends. Once they sign in, they’ll appear here.'}
        </EmptyState>
      ) : (
        <div className="people-grid">
          {visible.map((person) => {
            const days = daysUntilBirthday(person.birthday)
            const soon = days !== null && days <= 30
            return (
              <Link key={person.id} to={`/app/people/${person.id}`} className="person-card">
                <Avatar person={person} size={52} />
                <div className="person-card__body">
                  <h3 className="person-card__name">{person.full_name || 'Unnamed friend'}</h3>
                  <p className="person-card__meta">
                    {person.itemCount} {person.itemCount === 1 ? 'wish' : 'wishes'}
                  </p>
                  {person.birthday && (
                    <span className={`chip ${soon ? 'chip--accent' : ''}`}>
                      <CalendarHeart size={13} /> {birthdayLabel(person.birthday)}
                    </span>
                  )}
                </div>
                <ChevronRight className="person-card__chevron" size={18} />
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
