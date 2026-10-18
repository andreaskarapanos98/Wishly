export const CURRENCIES = ['EUR', 'USD', 'GBP']

export function formatPrice(price, currency = 'EUR') {
  if (price === null || price === undefined || price === '') return null
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: Number(price) % 1 === 0 ? 0 : 2,
    }).format(price)
  } catch {
    return `${price} ${currency}`
  }
}

export function firstName(fullName) {
  return (fullName || '').trim().split(/\s+/)[0] || 'Someone'
}

export function initials(fullName) {
  const parts = (fullName || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() || '?'
}

export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// Accept "amazon.com/..." as well as full URLs.
export function normalizeUrl(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** Days until the next occurrence of a birthday (0 = today). */
export function daysUntilBirthday(birthday) {
  if (!birthday) return null
  const [, month, day] = birthday.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), month - 1, day)
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day)
  return Math.round((next - today) / 86_400_000)
}

export function formatBirthday(birthday) {
  if (!birthday) return null
  const [, month, day] = birthday.split('-').map(Number)
  return new Date(2000, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  })
}

export function birthdayLabel(birthday) {
  const days = daysUntilBirthday(birthday)
  if (days === null) return null
  if (days === 0) return 'Birthday today 🎉'
  if (days === 1) return 'Birthday tomorrow'
  if (days <= 60) return `Birthday in ${days} days`
  return `Birthday ${formatBirthday(birthday)}`
}
