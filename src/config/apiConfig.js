/**
 * API base URL for requests and asset URLs (e.g. profile images).
 * After deploy: set VITE_API_URL when building (e.g. VITE_API_URL=https://api.yourdomain.com npm run build),
 * or set window.__VITE_API_URL__ in index.html before the app loads for runtime override.
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__VITE_API_URL__) {
    return window.__VITE_API_URL__.replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
}

/**
 * Build full URL for profile/avatar images so they work after deploy.
 * When API base is still localhost but the app is opened from another origin (e.g. production),
 * use current origin so /uploads/... resolves to the same host (assumes API is served from same origin).
 */
export function getProfileImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  let base = getApiBaseUrl()
  const isLocalhostBase = /^https?:\/\/localhost(:\d+)?$/i.test(base)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const isDeployed = currentOrigin && !/^https?:\/\/localhost(:\d+)?$/i.test(currentOrigin)
  if (isDeployed && isLocalhostBase) {
    base = currentOrigin
  }
  return `${base}${path}`
}
