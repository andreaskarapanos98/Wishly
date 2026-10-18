import { useState } from 'react'
import { ExternalLink, Pencil, Trash2, Gift, Check, Loader2, Heart } from 'lucide-react'
import Avatar from './Avatar.jsx'
import { firstName, formatPrice, hostname } from '../lib/format.js'
import { isUploadedPhoto } from '../lib/photos.js'

/**
 * mode="owner"  → edit / delete buttons, claims are never shown (RLS hides them anyway)
 * mode="friend" → "I'll buy it" button and who is buying it
 */
export default function ItemCard({ item, mode, currentUserId, onEdit, onDelete, onClaim, onRelease }) {
  const [busy, setBusy] = useState(false)
  const [imgBroken, setImgBroken] = useState(false)

  const price = formatPrice(item.price, item.currency)
  const site = hostname(item.url)
  const claim = mode === 'friend' ? item.claim : null
  const claimedByMe = claim?.claimer_id === currentUserId

  async function run(action) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`item ${claim ? 'item--claimed' : ''}`}>
      <div className="item__media">
        {item.image_url && !imgBroken ? (
          <a href={item.image_url} target="_blank" rel="noreferrer noopener" aria-label="Open photo">
            <img
              className={isUploadedPhoto(item.image_url) ? 'item__photo' : undefined}
              src={item.image_url}
              alt=""
              loading="lazy"
              onError={() => setImgBroken(true)}
            />
          </a>
        ) : (
          <Gift size={30} strokeWidth={1.4} />
        )}
        {item.priority === 3 && (
          <span className="item__badge">
            <Heart size={12} fill="currentColor" /> Top wish
          </span>
        )}
      </div>

      <div className="item__body">
        <h3 className="item__title">{item.title}</h3>
        <div className="item__meta">
          {price && <span className="item__price">{price}</span>}
          {site && (
            <a className="item__link" href={item.url} target="_blank" rel="noreferrer noopener">
              {site} <ExternalLink size={13} />
            </a>
          )}
        </div>
        {item.notes && <p className="item__notes">{item.notes}</p>}
      </div>

      <footer className="item__footer">
        {mode === 'owner' && (
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => onEdit(item)}>
              <Pencil size={15} /> Edit
            </button>
            <button
              className="btn btn--ghost btn--sm btn--danger"
              onClick={() => run(() => onDelete(item))}
              disabled={busy}
            >
              <Trash2 size={15} /> Remove
            </button>
          </>
        )}

        {mode === 'friend' && !claim && (
          <button
            className="btn btn--primary btn--sm btn--block"
            onClick={() => run(() => onClaim(item))}
            disabled={busy}
          >
            {busy ? <Loader2 className="spin" size={15} /> : <Gift size={15} />}
            I'll buy it
          </button>
        )}

        {mode === 'friend' && claim && (
          <div className="claim">
            <Avatar person={claim.claimer} size={26} />
            <span className="claim__text">
              {claimedByMe ? (
                <>
                  <Check size={14} /> You're buying this
                </>
              ) : (
                <>{firstName(claim.claimer?.full_name)} is buying this</>
              )}
            </span>
            {claimedByMe && (
              <button
                className="btn btn--link btn--sm"
                onClick={() => run(() => onRelease(item))}
                disabled={busy}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </footer>
    </article>
  )
}
