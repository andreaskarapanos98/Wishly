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

/** Days until the next yearly occurrence of a date like "1998-03-21" (0 = today). */
export function daysUntil(date) {
  if (!date) return null
  const [, month, day] = date.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), month - 1, day)
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day)
  return Math.round((next - today) / 86_400_000)
}

export function formatDayMonth(date) {
  if (!date) return null
  const [, month, day] = date.split('-').map(Number)
  return new Date(2000, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  })
}

function occasionLabel(date, name) {
  const days = daysUntil(date)
  if (days === null) return null
  if (days === 0) return `${name} today 🎉`
  if (days === 1) return `${name} tomorrow`
  if (days <= 60) return `${name} in ${days} days`
  return `${name} ${formatDayMonth(date)}`
}

export const birthdayLabel = (date) => occasionLabel(date, 'Birthday')
export const namedayLabel = (date) => occasionLabel(date, 'Name day')

/** Days until whichever comes first: birthday or name day. */
export function daysUntilNextOccasion(person) {
  const days = [daysUntil(person.birthday), daysUntil(person.nameday)].filter((d) => d !== null)
  return days.length ? Math.min(...days) : null
}
