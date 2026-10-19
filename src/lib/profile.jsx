import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUser } from '@clerk/react'
import { useSupabase } from './supabase.jsx'
import { syncProfile, updateProfile } from './api.js'
import { useToast, errorMessage } from './toast.jsx'
import ProfileForm from '../components/ProfileForm.jsx'

const ProfileContext = createContext(null)

/**
 * Makes sure the signed-in Clerk user has a row in `profiles`, keeps their
 * name and photo in sync with Google/Clerk, and exposes it to the app.
 */
export function ProfileProvider({ children }) {
  const sb = useSupabase()
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    if (!isLoaded || !user) return
    let cancelled = false
    syncProfile(sb, {
      id: user.id,
      full_name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || '',
      avatar_url: user.imageUrl,
      email: user.primaryEmailAddress?.emailAddress ?? null,
    })
      .then((row) => !cancelled && setProfile(row))
      .catch((err) => !cancelled && setError(err))
    return () => {
      cancelled = true
    }
  }, [sb, isLoaded, user?.id, user?.fullName, user?.imageUrl, user?.primaryEmailAddress?.emailAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = useCallback(
    async (changes) => {
      const row = await updateProfile(sb, profile.id, changes)
      setProfile(row)
      return row
    },
    [sb, profile?.id],
  )

  // The "Your details" form (birthday, name day, note) can be opened from
  // anywhere: the avatar menu or the Details button on My wishlist.
  const [detailsOpen, setDetailsOpen] = useState(false)
  const openDetails = useCallback(() => setDetailsOpen(true), [])

  async function handleDetailsSave(changes) {
    try {
      await saveProfile(changes)
      setDetailsOpen(false)
      toast('Details saved')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <ProfileContext.Provider value={{ profile, error, saveProfile, openDetails }}>
      {children}
      {detailsOpen && profile && (
        <ProfileForm
          profile={profile}
          onSubmit={handleDetailsSave}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
