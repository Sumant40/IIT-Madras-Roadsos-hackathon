const STORAGE_KEY = 'roadsos-sos-card'

export function saveSosCard(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...payload,
      savedAt: new Date().toISOString(),
    }))
  } catch (err) {
    console.warn('Could not save SOS card', err)
  }
}

export function loadSosCard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function buildShareUrl(lat, lng, label) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  })
  if (label) params.set('label', label)
  return `${window.location.origin}/emergency?${params.toString()}`
}
