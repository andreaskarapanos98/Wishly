import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSupabase } from './supabase.jsx'
import { useProfile } from './profile.jsx'
import { listFriendships } from './api.js'

const FriendsContext = createContext(null)

/**
 * The current user's friends and pending requests, shared by the nav badge
 * and the Friends pages. Refreshes when the tab regains focus so new
 * requests show up without a reload.
 */
export function FriendsProvider({ children }) {
  const sb = useSupabase()
  const { profile } = useProfile()
  const [data, setData] = useState(null) // { friends, incoming, outgoing }
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setData(await listFriendships(sb, profile.id))
      setError(null)
    } catch (err) {
      setError(err)
    }
  }, [sb, profile.id])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  return (
    <FriendsContext.Provider value={{ ...data, loading: data === null, error, refresh }}>
      {children}
    </FriendsContext.Provider>
  )
}

export function useFriends() {
  return useContext(FriendsContext)
}
