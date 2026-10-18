import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }),
)
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// Name days repeat every year, so we only ask for day + month and store the
// date with the year 2000.
function splitDayMonth(date) {
  if (!date) return { month: '', day: '' }
  const [, month, day] = date.split('-').map(Number)
  return { month: String(month), day: String(day) }
}

function joinDayMonth({ month, day }) {
  if (!month || !day) return null
  return `2000-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export default function ProfileForm({ profile, onSubmit, onClose }) {
  const [birthday, setBirthday] = useState(profile.birthday ?? '')
  const [nameday, setNameday] = useState(splitDayMonth(profile.nameday))
  const [bio, setBio] = useState(profile.bio ?? '')
  const [saving, setSaving] = useState(false)

  const maxDay = nameday.month ? DAYS_IN_MONTH[Number(nameday.month) - 1] : 31

  function setNamedayPart(part, value) {
    setNameday((current) => {
      const next = { ...current, [part]: value }
      const limit = next.month ? DAYS_IN_MONTH[Number(next.month) - 1] : 31
      if (Number(next.day) > limit) next.day = String(limit)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        birthday: birthday || null,
        nameday: joinDayMonth(nameday),
        bio: bio.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Your details"
      subtitle="Your name and photo come from your Google account."
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Birthday</span>
          <input
            className="input"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <span className="field__hint">Friends see the day and month, so they know when to shop.</span>
        </label>

        <fieldset className="field">
          <legend className="field__label">
            Name day <em>optional</em>
          </legend>
          <div className="form__row form__row--even">
            <select
              className="input"
              aria-label="Name day month"
              value={nameday.month}
              onChange={(e) => setNamedayPart('month', e.target.value)}
            >
              <option value="">Month</option>
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="input"
              aria-label="Name day day"
              value={nameday.day}
              onChange={(e) => setNamedayPart('day', e.target.value)}
            >
              <option value="">Day</option>
              {Array.from({ length: maxDay }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          {(nameday.month || nameday.day) && (
            <button
              type="button"
              className="btn btn--link field__clear"
              onClick={() => setNameday({ month: '', day: '' })}
            >
              Clear name day
            </button>
          )}
        </fieldset>

        <label className="field">
          <span className="field__label">A note for your friends <em>optional</em></span>
          <textarea
            className="input"
            rows={3}
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Sizes: M for tops, 43 for shoes. I love anything matcha."
          />
        </label>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving || Boolean(nameday.month) !== Boolean(nameday.day)}
          >
            {saving && <Loader2 className="spin" size={16} />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
