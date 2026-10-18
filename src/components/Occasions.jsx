import { Cake, Sparkles } from 'lucide-react'
import { birthdayLabel, daysUntil, namedayLabel } from '../lib/format.js'

/** A person's upcoming birthday and name day, as inline text or as chips. */
export default function Occasions({ person, variant = 'inline', iconSize = 14 }) {
  const occasions = [
    { date: person.birthday, label: birthdayLabel(person.birthday), icon: Cake },
    { date: person.nameday, label: namedayLabel(person.nameday), icon: Sparkles },
  ].filter((o) => o.label)

  if (occasions.length === 0) return null

  if (variant === 'chips') {
    return (
      <span className="chips">
        {occasions.map(({ date, label, icon: Icon }) => (
          <span key={label} className={`chip ${daysUntil(date) <= 30 ? 'chip--accent' : ''}`}>
            <Icon size={13} /> {label}
          </span>
        ))}
      </span>
    )
  }

  return occasions.map(({ label, icon: Icon }, i) => (
    <span key={label} className="occasion">
      {i > 0 && <span className="dot">·</span>}
      <Icon size={iconSize} /> {label}
    </span>
  ))
}
