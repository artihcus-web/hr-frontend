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
 * Handles multiple formats:
 * - GridFS endpoint: /api/auth/users/:id/avatar
 * - Legacy file path: /uploads/profiles/xxx.jpg
 * - GridFS ObjectId: converts to endpoint using user ID
 * - Full URLs: returns as-is
 */
export function getProfileImageUrl(url, userId = null) {
  if (!url) return ''
  
  // Already a full URL (http/https/data/blob)
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  
  // If it's already an API endpoint path, just prepend base URL
  if (url.startsWith('/api/auth/users/') && url.includes('/avatar')) {
    const base = getApiBaseUrl()
    return `${base}${url}`
  }
  
  // If it's a GridFS ObjectId (24 char hex string) and we have userId, convert to endpoint
  if (userId && /^[0-9a-fA-F]{24}$/.test(url)) {
    const base = getApiBaseUrl()
    return `${base}/api/auth/users/${userId}/avatar`
  }
  
  // Legacy file path format (/uploads/profiles/xxx.jpg)
  const path = url.startsWith('/') ? url : `/${url}`
  const base = getApiBaseUrl()
  return `${base}${path}`
}
