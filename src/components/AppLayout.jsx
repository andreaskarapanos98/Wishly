import { NavLink, Outlet } from 'react-router-dom'
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react'
import { Gift, Users, ShoppingBag, Loader2, Lock, CalendarHeart } from 'lucide-react'
import Logo, { LogoMark } from './Logo.jsx'
import { ProfileProvider, useProfile } from '../lib/profile.jsx'
import { FriendsProvider, useFriends } from '../lib/friends.jsx'

const NAV = [
  { to: '/app/wishlist', label: 'My wishlist', icon: Gift },
  { to: '/app/friends', label: 'Friends', icon: Users, badge: 'requests' },
  { to: '/app/gifts', label: "Gifts I'm buying", icon: ShoppingBag },
]

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <FullPageLoader />
  if (!isSignedIn) return <SignInWall />

  return (
    <ProfileProvider>
      <AppShell />
    </ProfileProvider>
  )
}

function AppShell() {
  const { profile, error } = useProfile()

  const shell = (
    <div className="app">
      <header className="app-header">
        <div className="container app-header__inner">
          <Logo to="/" />
          <nav className="app-nav" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, badge }) => (
              <NavLink key={to} to={to} className="app-nav__link">
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
                {badge && <RequestsBadge />}
              </NavLink>
            ))}
          </nav>
          <AccountMenu />
        </div>
      </header>
      <main className="app-main">
        <div className="container">
          {error ? (
            <div className="notice notice--error">
              <strong>We couldn't connect to the database.</strong>
              <span>
                {error.message} — check that <code>supabase/schema.sql</code> has been run and that
                Clerk is added as a third-party auth provider in Supabase.
              </span>
            </div>
          ) : profile ? (
            <Outlet />
          ) : (
            <PageLoader />
          )}
        </div>
      </main>
    </div>
  )

  // Pages rely on the profile row, so friends load only once it exists.
  return profile ? <FriendsProvider>{shell}</FriendsProvider> : shell
}

// Clerk's avatar menu, plus our own "Birthday & name day" item.
// "Manage account" (name, photo, email) and "Sign out" stay Clerk's.
function AccountMenu() {
  const { profile, openDetails } = useProfile()
  return (
    <UserButton appearance={{ elements: { avatarBox: { width: 36, height: 36 } } }}>
      <UserButton.MenuItems>
        {profile && (
          <UserButton.Action
            label="Birthday & name day"
            labelIcon={<CalendarHeart size={15} />}
            onClick={openDetails}
          />
        )}
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  )
}

function RequestsBadge() {
  const count = useFriends()?.incoming?.length ?? 0
  if (!count) return null
  return (
    <span className="nav-badge" aria-label={`${count} friend request${count === 1 ? '' : 's'}`}>
      {count}
    </span>
  )
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
        <div className="setup__actions">
          <SignInButton mode="modal">
            <button className="btn btn--primary btn--lg">Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="btn btn--outline btn--lg">Create an account</button>
          </SignUpButton>
        </div>
        <p className="setup__hint">Use your Google account or any email address.</p>
      </div>
    </main>
  )
}
