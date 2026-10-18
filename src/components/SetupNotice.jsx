import { LogoMark } from './Logo.jsx'

// Shown instead of the app until the environment variables are filled in.
export default function SetupNotice({ missing }) {
  return (
    <main className="setup">
      <div className="setup__card">
        <LogoMark size={44} />
        <h1 className="setup__title">Almost there</h1>
        <p>
          Wishly needs a few keys before it can run. Copy <code>.env.example</code> to{' '}
          <code>.env.local</code>, fill in these values and restart <code>npm run dev</code>:
        </p>
        <ul className="setup__list">
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
        <p className="muted">The README walks through creating the Clerk and Supabase projects.</p>
      </div>
    </main>
  )
}
