import { Link } from 'react-router-dom'

export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--ink)" />
      <path
        d="M32 14l4.6 10.4L48 26l-8.4 7.6L42 45l-10-5.8L22 45l2.4-11.4L16 26l11.4-1.6z"
        fill="var(--gold-soft)"
      />
    </svg>
  )
}

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo--light' : ''}`} aria-label="Wishly home">
      <LogoMark />
      <span className="logo__word">Wishly</span>
    </Link>
  )
}
