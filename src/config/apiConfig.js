/**
 * API base URL for requests and asset URLs (profile images served via GridFS).
 * Set VITE_API_URL when building for production.
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__VITE_API_URL__) {
    return window.__VITE_API_URL__.replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
}

/**
 * Build full URL for profile/avatar images (GridFS storage only).
 * - GridFS endpoint path: /api/auth/users/:id/avatar
 * - GridFS ObjectId (24 char hex): converts to endpoint using userId
 * - Full URLs (http, blob, data): returns as-is
 */
export function getProfileImageUrl(url, userId = null) {
  if (!url) return ''

  // Full URL or blob/data URL - return as-is
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  const base = getApiBaseUrl()

  // GridFS endpoint path - prepend base URL
  if (url.startsWith('/api/auth/users/') && url.includes('/avatar')) {
    return `${base}${url}`
  }

  // GridFS ObjectId (24 char hex) - convert to endpoint using userId
  if (userId && /^[0-9a-fA-F]{24}$/.test(String(url))) {
    return `${base}/api/auth/users/${userId}/avatar`
  }

  return ''
}

/** Build full URL for documents/attachments (non-profile assets). */
export function getAssetUrl(url) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const base = getApiBaseUrl()
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}
