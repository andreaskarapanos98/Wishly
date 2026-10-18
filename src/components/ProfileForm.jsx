import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'

export default function ProfileForm({ profile, onSubmit, onClose }) {
  const [birthday, setBirthday] = useState(profile.birthday ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit({ birthday: birthday || null, bio: bio.trim() || null })
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
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving && <Loader2 className="spin" size={16} />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
