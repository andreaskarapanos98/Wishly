import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'
import { CURRENCIES, normalizeUrl } from '../lib/format.js'

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

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        url: normalizeUrl(form.url),
        image_url: normalizeUrl(form.image_url),
        price: form.price === '' ? null : Number(form.price),
        currency: form.currency,
        notes: form.notes.trim() || null,
        priority: Number(form.priority),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={item ? 'Edit wish' : 'Add a wish'}
      subtitle={item ? null : 'Paste a link so friends know exactly what to get.'}
      onClose={onClose}
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

        <label className="field">
          <span className="field__label">Image link <em>optional</em></span>
          <input
            className="input"
            value={form.image_url}
            onChange={set('image_url')}
            placeholder="Right-click a product photo → Copy image address"
            inputMode="url"
          />
        </label>

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
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="spin" size={16} />}
            {item ? 'Save changes' : 'Add to wishlist'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export { PRIORITIES }
