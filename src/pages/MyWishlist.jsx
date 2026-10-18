import { useCallback, useEffect, useState } from 'react'
import { Plus, Gift, CalendarHeart, Settings2, EyeOff } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import ItemCard from '../components/ItemCard.jsx'
import ItemForm from '../components/ItemForm.jsx'
import ProfileForm from '../components/ProfileForm.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { PageLoader } from '../components/AppLayout.jsx'
import { useSupabase } from '../lib/supabase.jsx'
import { useProfile } from '../lib/profile.jsx'
import { useToast, errorMessage } from '../lib/toast.jsx'
import { createItem, deleteItem, listItems, updateItem } from '../lib/api.js'
import { birthdayLabel, firstName } from '../lib/format.js'

export default function MyWishlist() {
  const sb = useSupabase()
  const toast = useToast()
  const { profile, saveProfile } = useProfile()
  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | item
  const [editingProfile, setEditingProfile] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await listItems(sb, profile.id))
    } catch (err) {
      toast(errorMessage(err), 'error')
      setItems([])
    }
  }, [sb, profile.id, toast])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(values) {
    try {
      if (editing === 'new') {
        await createItem(sb, values)
        toast('Added to your wishlist')
      } else {
        await updateItem(sb, editing.id, values)
        toast('Wish updated')
      }
      setEditing(null)
      load()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Remove “${item.title}” from your wishlist?`)) return
    try {
      await deleteItem(sb, item.id)
      setItems((list) => list.filter((i) => i.id !== item.id))
      toast('Removed from your wishlist')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  async function handleProfileSave(values) {
    try {
      await saveProfile(values)
      setEditingProfile(false)
      toast('Details saved')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const birthday = birthdayLabel(profile.birthday)

  return (
    <>
      <section className="page-head">
        <div className="page-head__person">
          <Avatar person={profile} size={64} />
          <div>
            <p className="eyebrow">My wishlist</p>
            <h1 className="page-title">Hi, {firstName(profile.full_name)}</h1>
            <p className="page-sub">
              {birthday ? (
                <>
                  <CalendarHeart size={15} /> {birthday}
                </>
              ) : (
                <button className="btn btn--link" onClick={() => setEditingProfile(true)}>
                  Add your birthday so friends know when to shop
                </button>
              )}
            </p>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--ghost" onClick={() => setEditingProfile(true)}>
            <Settings2 size={17} /> Details
          </button>
          <button className="btn btn--primary" onClick={() => setEditing('new')}>
            <Plus size={18} /> Add a wish
          </button>
        </div>
      </section>

      {profile.bio && <p className="bio">“{profile.bio}”</p>}

      <p className="hint">
        <EyeOff size={15} /> Friends can claim gifts from your list. You won’t see who, so it stays
        a surprise.
      </p>

      {items === null ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Your wishlist is empty"
          action={
            <button className="btn btn--primary" onClick={() => setEditing('new')}>
              <Plus size={18} /> Add your first wish
            </button>
          }
        >
          Think of something you’ve been eyeing for a while. A link and a price help your friends
          get it right.
        </EmptyState>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              mode="owner"
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editing && (
        <ItemForm
          item={editing === 'new' ? null : editing}
          onSubmit={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {editingProfile && (
        <ProfileForm
          profile={profile}
          onSubmit={handleProfileSave}
          onClose={() => setEditingProfile(false)}
        />
      )}
    </>
  )
}
