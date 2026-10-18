import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo.jsx'

export default function NotFound() {
  return (
    <main className="setup">
      <div className="setup__card setup__card--center">
        <LogoMark size={44} />
        <h1 className="setup__title">Page not found</h1>
        <p className="muted">This page wandered off. Let’s get you back.</p>
        <Link to="/" className="btn btn--primary">
          Go home
        </Link>
      </div>
    </main>
  )
}
