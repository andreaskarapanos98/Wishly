import { createContext, useContext, useMemo, useRef } from 'react'
import { useSession } from '@clerk/react'
import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

const SupabaseContext = createContext(null)

/**
 * One Supabase client for the whole app. Every request is signed with the
 * current Clerk session token, which Supabase verifies through its Clerk
 * third-party auth integration. RLS policies then read the user id from it.
 */
export function SupabaseProvider({ children }) {
  const { session } = useSession()
  const sessionRef = useRef(session)
  sessionRef.current = session

  const client = useMemo(
    () =>
      createClient(config.supabaseUrl, config.supabaseKey, {
        accessToken: async () => (await sessionRef.current?.getToken()) ?? null,
      }),
    [],
  )

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}

export function useSupabase() {
  const client = useContext(SupabaseContext)
  if (!client) throw new Error('useSupabase must be used inside <SupabaseProvider>')
  return client
}
