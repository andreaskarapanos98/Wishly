import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { config, missingConfig } from './lib/config.js'
import { SupabaseProvider } from './lib/supabase.jsx'
import { ToastProvider } from './lib/toast.jsx'
import SetupNotice from './components/SetupNotice.jsx'
import AppLayout from './components/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
import MyWishlist from './pages/MyWishlist.jsx'
import Friends from './pages/Friends.jsx'
import Person from './pages/Person.jsx'
import Gifts from './pages/Gifts.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const navigate = useNavigate()

  if (missingConfig.length > 0) return <SetupNotice missing={missingConfig} />

  return (
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl={import.meta.env.BASE_URL}
      signInFallbackRedirectUrl={`${import.meta.env.BASE_URL}app`}
      signUpFallbackRedirectUrl={`${import.meta.env.BASE_URL}app`}
      appearance={{
        variables: {
          colorPrimary: '#1d1a17',
          colorText: '#1d1a17',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '12px',
        },
      }}
    >
      <SupabaseProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="wishlist" replace />} />
              <Route path="wishlist" element={<MyWishlist />} />
              <Route path="friends" element={<Friends />} />
              <Route path="friends/:personId" element={<Person />} />
              {/* Old links from before friendships */}
              <Route path="people" element={<Navigate to="/app/friends" replace />} />
              <Route path="people/:personId" element={<LegacyPersonRedirect />} />
              <Route path="gifts" element={<Gifts />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </SupabaseProvider>
    </ClerkProvider>
  )
}

function LegacyPersonRedirect() {
  const { personId } = useParams()
  return <Navigate to={`/app/friends/${personId}`} replace />
}
