// Wish photos live in the public "wish-photos" Storage bucket, in a folder
// named after the uploader's Clerk user id (enforced by storage policies).

const BUCKET = 'wish-photos'
const MAX_SIZE = 1200 // px, longest side
const QUALITY = 0.82

/** Shrinks a photo in the browser and re-encodes it as WebP. */
async function compress(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('We couldn’t read that photo. Try a JPG or PNG.')
  }
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
  if (!blob) throw new Error('We couldn’t process that photo.')
  return blob
}

/** Uploads a photo and returns its public URL. */
export async function uploadWishPhoto(sb, userId, file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  const blob = await compress(file)
  const path = `${userId}/${crypto.randomUUID()}.webp`
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw error
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** The storage path for a URL from our bucket, or null for outside links. */
function pathFromUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url?.indexOf(marker) ?? -1
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
}

export function isUploadedPhoto(url) {
  return pathFromUrl(url) !== null
}

/** Deletes an uploaded photo. Outside image links are ignored. Never throws. */
export async function deleteWishPhoto(sb, url) {
  const path = pathFromUrl(url)
  if (!path) return
  const { error } = await sb.storage.from(BUCKET).remove([path])
  if (error) console.warn('Could not delete photo', error)
}
