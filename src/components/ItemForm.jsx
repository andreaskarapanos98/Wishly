import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'
import PhotoField from './PhotoField.jsx'
import { CURRENCIES, normalizeUrl } from '../lib/format.js'
import { useSupabase } from '../lib/supabase.jsx'
import { useProfile } from '../lib/profile.jsx'
import { useToast, errorMessage } from '../lib/toast.jsx'
import { deleteWishPhoto, uploadWishPhoto } from '../lib/photos.js'

const PRIORITIES = [
  { value: 3, label: 'Would love it' },
  { value: 2, label: 'Would like it' },
  { value: 1, label: 'Nice to have' },
]

export default function ItemForm({ item, onSubmit, onClose }) {
  const [form, setForm] = useState({
    title: item?.title ?? '',
    url: item?.url ?? '',
    price: item?.price ?? '',
    currency: item?.currency ?? 'EUR',
    image_url: item?.image_url ?? '',
    notes: item?.notes ?? '',
    priority: item?.priority ?? 2,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const sb = useSupabase()
  const toast = useToast()
  const { profile } = useProfile()
  // Photos uploaded while this form is open; the ones not kept get deleted.
  const uploads = useRef([])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleUpload(file) {
    setUploading(true)
    try {
      const url = await uploadWishPhoto(sb, profile.id, file)
      uploads.current.push(url)
      setForm((f) => ({ ...f, image_url: url }))
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setUploading(false)
    }
  }

  // Delete uploaded photos that didn't end up on the saved wish.
  function cleanUp(keptUrl) {
    const candidates = [...uploads.current, item?.image_url]
    candidates.filter((url) => url && url !== keptUrl).forEach((url) => deleteWishPhoto(sb, url))
  }

  function handleClose() {
    uploads.current.forEach((url) => deleteWishPhoto(sb, url))
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const imageUrl = normalizeUrl(form.image_url)
    try {
      const saved = await onSubmit({
        title: form.title.trim(),
        url: normalizeUrl(form.url),
        image_url: imageUrl,
        price: form.price === '' ? null : Number(form.price),
        currency: form.currency,
        notes: form.notes.trim() || null,
        priority: Number(form.priority),
      })
      if (saved) cleanUp(imageUrl)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={item ? 'Edit wish' : 'Add a wish'}
      subtitle={item ? null : 'Add a link or a photo so friends know exactly what to get.'}
      onClose={handleClose}
    >
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">What would you like?</span>
          <input
            className="input"
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Sony WH-1000XM5 headphones"
            maxLength={200}
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Link <em>optional</em></span>
          <input
            className="input"
            value={form.url}
            onChange={set('url')}
            placeholder="https://…"
            inputMode="url"
          />
        </label>

        <div className="form__row">
          <label className="field">
            <span className="field__label">Price <em>optional</em></span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={set('price')}
              placeholder="0.00"
            />
          </label>
          <label className="field field--narrow">
            <span className="field__label">Currency</span>
            <select className="input" value={form.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="field">
          <legend className="field__label">How much do you want it?</legend>
          <div className="segmented">
            {PRIORITIES.map((p) => (
              <label key={p.value} className="segmented__option">
                <input
                  type="radio"
                  name="priority"
                  value={p.value}
                  checked={Number(form.priority) === p.value}
                  onChange={set('priority')}
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <span className="field__label">Photo <em>optional</em></span>
          <PhotoField
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            onUpload={handleUpload}
            uploading={uploading}
          />
        </div>

        <label className="field">
          <span className="field__label">Notes <em>optional</em></span>
          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Size, colour, any store is fine…"
            maxLength={1000}
          />
        </label>

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving || uploading || !form.title.trim()}
          >
            {saving && <Loader2 className="spin" size={16} />}
            {item ? 'Save changes' : 'Add to wishlist'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
