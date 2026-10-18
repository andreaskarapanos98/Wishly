import { useState } from 'react'
import { initials } from '../lib/format.js'

export default function Avatar({ person, size = 40 }) {
  const [broken, setBroken] = useState(false)
  const style = { width: size, height: size, fontSize: size * 0.38 }

  if (person?.avatar_url && !broken) {
    return (
      <img
        className="avatar"
        style={style}
        src={person.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <span className="avatar avatar--initials" style={style} aria-hidden="true">
      {initials(person?.full_name)}
    </span>
  )
}
