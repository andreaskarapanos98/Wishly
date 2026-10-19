import { Link } from 'react-router-dom'
import { SignInButton, SignUpButton, useAuth } from '@clerk/react'
import {
  ArrowRight,
  CalendarHeart,
  EyeOff,
  Gift,
  Link2,
  ShieldCheck,
  Sparkles,
  Users,
  Check,
  Heart,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'

function PrimaryCta({ children, className = 'btn btn--primary btn--lg' }) {
  const { isSignedIn } = useAuth()
  if (isSignedIn) {
    return (
      <Link to="/app/wishlist" className={className}>
        Open my wishlist <ArrowRight size={18} />
      </Link>
    )
  }
  return (
    <SignUpButton mode="modal">
      <button className={className}>
        {children} <ArrowRight size={18} />
      </button>
    </SignUpButton>
  )
}

export default function Landing() {
  const { isSignedIn } = useAuth()

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="container landing-nav__inner">
          <Logo />
          <nav className="landing-nav__links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#features">Why Wishly</a>
          </nav>
          {isSignedIn ? (
            <Link to="/app/wishlist" className="btn btn--outline btn--sm">
              Open app
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button className="btn btn--outline btn--sm">Sign in</button>
            </SignInButton>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="eyebrow">
              <Sparkles size={14} /> For birthdays, name days &amp; everything in between
            </p>
            <h1 className="hero__title">
              Gifts they’ll <em>actually</em> love.
            </h1>
            <p className="hero__lead">
              Wishly is a private wishlist for you and your friends. Add what you’d love to
              receive, see what your friends are hoping for, and quietly claim a gift so nobody
              buys the same thing twice.
            </p>
            <div className="hero__actions">
              <PrimaryCta>Create your wishlist</PrimaryCta>
              <a href="#how" className="btn btn--ghost btn--lg">
                See how it works
              </a>
            </div>
            <p className="hero__note">
              <ShieldCheck size={15} /> Free · Sign in with Google or email · No ads, ever
            </p>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section">
        <div className="container">
          <div className="section__head">
            <p className="eyebrow">How it works</p>
            <h2 className="section__title">Three steps to better gifting</h2>
          </div>
          <ol className="steps">
            <li className="step">
              <span className="step__num">01</span>
              <h3>Make your list</h3>
              <p>
                Add the things you’d genuinely love: a link, a price, a note about size or
                colour. Mark your top wishes so friends know what matters most.
              </p>
            </li>
            <li className="step">
              <span className="step__num">02</span>
              <h3>Add your friends</h3>
              <p>
                Find friends by name or email and send a request. Once they accept, you can
                see each other’s wishlists, sorted by whose birthday is coming up next.
              </p>
            </li>
            <li className="step">
              <span className="step__num">03</span>
              <h3>Claim a gift</h3>
              <p>
                Tap <strong>“I’ll buy it”</strong>. Everyone else sees it’s taken, but the
                birthday person never does, so the surprise stays a surprise.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section section--tinted">
        <div className="container">
          <div className="section__head">
            <p className="eyebrow">Why Wishly</p>
            <h2 className="section__title">Thoughtful by design</h2>
          </div>
          <div className="features">
            <Feature icon={EyeOff} title="Surprises stay secret">
              You’ll never see who claimed what on your own list. Only your friends can.
            </Feature>
            <Feature icon={Users} title="Friends only">
              Your list is visible only to friends you’ve accepted. One claim per gift, so
              nobody buys the same thing twice.
            </Feature>
            <Feature icon={CalendarHeart} title="Birthday countdowns">
              Add your birthday once and friends see it coming in plenty of time.
            </Feature>
            <Feature icon={Link2} title="Any shop, any link">
              Amazon, a local boutique, a concert ticket. If it has a link, it fits.
            </Feature>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="cta-band">
        <div className="container cta-band__inner">
          <h2 className="cta-band__title">
            The next birthday is closer than you think.
          </h2>
          <p className="cta-band__text">Start your wishlist in under a minute.</p>
          <PrimaryCta className="btn btn--gold btn--lg">Get started</PrimaryCta>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__inner">
          <Logo />
          <p className="muted">Made with care for friends who like giving good gifts.</p>
          <p className="muted">© {new Date().getFullYear()} Wishly</p>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, children }) {
  return (
    <div className="feature">
      <div className="feature__icon">
        <Icon size={22} strokeWidth={1.7} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

// A static, illustrative mock of the app for the hero section.
function HeroPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview__card preview__card--back">
        <div className="preview__person">
          <span className="avatar avatar--initials" style={{ width: 36, height: 36, fontSize: 13 }}>
            EL
          </span>
          <div>
            <strong>Elena’s wishlist</strong>
            <span>Birthday in 12 days</span>
          </div>
        </div>
      </div>

      <div className="preview__card">
        <div className="preview__person">
          <span
            className="avatar avatar--initials"
            style={{ width: 40, height: 40, fontSize: 14, background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            NK
          </span>
          <div>
            <strong>Nikos’s wishlist</strong>
            <span>Birthday in 5 days · 4 wishes</span>
          </div>
        </div>

        <div className="preview__item">
          <div className="preview__thumb"><Gift size={18} /></div>
          <div className="preview__text">
            <strong>Noise-cancelling headphones</strong>
            <span>€279 · store.example</span>
          </div>
          <span className="preview__pill preview__pill--taken">
            <Check size={12} /> Maria is buying
          </span>
        </div>

        <div className="preview__item">
          <div className="preview__thumb"><Gift size={18} /></div>
          <div className="preview__text">
            <strong>Pour-over coffee set</strong>
            <span>€45 · Top wish</span>
          </div>
          <span className="preview__pill">I’ll buy it</span>
        </div>

        <div className="preview__item">
          <div className="preview__thumb"><Gift size={18} /></div>
          <div className="preview__text">
            <strong>Concert tickets — any date</strong>
            <span>€60</span>
          </div>
          <span className="preview__pill">I’ll buy it</span>
        </div>
      </div>

      <div className="preview__float">
        <Heart size={14} fill="currentColor" /> Surprise protected
      </div>
    </div>
  )
}
