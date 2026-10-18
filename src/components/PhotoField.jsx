import { useRef, useState } from 'react'
import { ImagePlus, Loader2, RefreshCw, Trash2, Link2 } from 'lucide-react'

/**
 * Photo picker for a wish: upload a photo (click or drag & drop) or paste an
 * image link. `onUpload(file)` must upload the file and return its URL.
 */
export default function PhotoField({ value, onChange, onUpload, uploading }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [linkMode, setLinkMode] = useState(false)
  const [broken, setBroken] = useState(false)

  function pick(files) {
    const file = files?.[0]
    if (file) {
      setBroken(false)
      onUpload(file)
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/*"
      hidden
      onChange={(e) => {
        pick(e.target.files)
        e.target.value = ''
      }}
    />
  )

  if (value && !linkMode) {
    return (
      <div className="photo-field">
        <div className="photo-field__preview">
          {broken ? (
            <span className="muted">This image link doesn’t load.</span>
          ) : (
            <img src={value} alt="Wish photo preview" onError={() => setBroken(true)} />
          )}
          {uploading && (
            <span className="photo-field__busy">
              <Loader2 className="spin" size={22} />
            </span>
          )}
        </div>
        <div className="photo-field__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => inputRef.current.click()}
            disabled={uploading}
          >
            <RefreshCw size={15} /> Replace
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--danger"
            onClick={() => onChange('')}
            disabled={uploading}
          >
            <Trash2 size={15} /> Remove
          </button>
        </div>
        {fileInput}
      </div>
    )
  }

  if (linkMode) {
    return (
      <div className="photo-field">
        <input
          className="input"
          value={value}
          onChange={(e) => {
            setBroken(false)
            onChange(e.target.value)
          }}
          placeholder="Right-click a product photo → Copy image address"
          inputMode="url"
          autoFocus
        />
        <button type="button" className="btn btn--link field__clear" onClick={() => setLinkMode(false)}>
          {value ? 'Done' : 'Upload a photo instead'}
        </button>
      </div>
    )
  }

  return (
    <div className="photo-field">
      <button
        type="button"
        className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          pick(e.dataTransfer.files)
        }}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="spin" size={24} /> : <ImagePlus size={24} strokeWidth={1.6} />}
        <span className="dropzone__title">{uploading ? 'Uploading…' : 'Add a photo'}</span>
        <span className="dropzone__hint">Take a picture or choose one · JPG, PNG or WebP</span>
      </button>
      <button type="button" className="btn btn--link field__clear" onClick={() => setLinkMode(true)}>
        <Link2 size={14} /> Or paste an image link
      </button>
      {fileInput}
    </div>
  )
}
