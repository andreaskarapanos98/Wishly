import { NavLink, Outlet } from 'react-router-dom'
import { SignInButton, UserButton, useAuth } from '@clerk/react'
import { Gift, Users, ShoppingBag, Loader2, Lock } from 'lucide-react'
import Logo, { LogoMark } from './Logo.jsx'
import { ProfileProvider, useProfile } from '../lib/profile.jsx'

const NAV = [
  { to: '/app/wishlist', label: 'My wishlist', icon: Gift },
  { to: '/app/people', label: 'People', icon: Users },
  { to: '/app/gifts', label: "Gifts I'm buying", icon: ShoppingBag },
]

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <FullPageLoader />
  if (!isSignedIn) return <SignInWall />

  return (
    <ProfileProvider>
      <div className="app">
        <header className="app-header">
          <div className="container app-header__inner">
            <Logo to="/" />
            <nav className="app-nav" aria-label="Main">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className="app-nav__link">
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <UserButton appearance={{ elements: { avatarBox: { width: 36, height: 36 } } }} />
          </div>
        </header>
        <main className="app-main">
          <div className="container">
            <ProfileGate />
          </div>
        </main>
      </div>
    </ProfileProvider>
  )
}

// Wait until the profile row exists before rendering pages that rely on it.
function ProfileGate() {
  const { profile, error } = useProfile()
  if (error) {
    return (
      <div className="notice notice--error">
        <strong>We couldn't connect to the database.</strong>
        <span>
          {error.message} — check that <code>supabase/schema.sql</code> has been run and that Clerk
          is added as a third-party auth provider in Supabase.
        </span>
      </div>
    )
  }
  if (!profile) return <PageLoader />
  return <Outlet />
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Loader2 className="spin" size={26} />
    </div>
  )
}

function FullPageLoader() {
  return (
    <div className="setup">
      <Loader2 className="spin" size={28} />
    </div>
  )
}

function SignInWall() {
  return (
    <main className="setup">
      <div className="setup__card setup__card--center">
        <LogoMark size={44} />
        <h1 className="setup__title">Sign in to Wishly</h1>
        <p className="muted">
          <Lock size={14} style={{ verticalAlign: '-2px' }} /> Wishlists are only visible to friends
          who have signed in.
        </p>
        <SignInButton mode="modal">
          <button className="btn btn--primary btn--lg">Continue with Google</button>
        </SignInButton>
      </div>
    </main>
  )
}
