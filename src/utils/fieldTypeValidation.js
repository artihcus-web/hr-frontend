/**
 * Schema-driven field type validation utilities.
 * Used by FormField to filter input based on schema type (text, alphanumeric, number).
 */

/**
 * Filters input value based on schema type.
 * @param {string} schemaType - One of 'text', 'alphanumeric', 'number'
 * @param {string} value - Raw input value
 * @param {object} options - Optional: { integerOnly, allowPercent }
 * @returns {string} Filtered value
 */
export function filterValueByType(schemaType, value, options = {}) {
  const v = value ?? ''
  const { integerOnly = false, allowPercent = false } = options

  switch (schemaType) {
    case 'text':
      // Alphabets, spaces, dots, hyphens - no numbers
      return v.replace(/[^a-zA-Z\s.-]/g, '')

    case 'alphanumeric':
      // Alphabets, numbers, spaces, dots, hyphens
      return v.replace(/[^a-zA-Z0-9\s.-]/g, '')

    case 'number': {
      if (allowPercent) {
        let filtered = v.replace(/[^0-9.%]/g, '')
        const idx = filtered.indexOf('%')
        if (idx !== -1 && idx !== filtered.length - 1) {
          filtered = filtered.replace(/%/g, '') + '%'
        }
        return filtered
      }
      if (integerOnly) {
        return v.replace(/[^0-9]/g, '')
      }
      const filtered = v.replace(/[^0-9.]/g, '')
      const parts = filtered.split('.')
      return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered
    }

    default:
      return v
  }
}

/**
 * Tests if a character is allowed for a given schema type.
 */
export function isCharAllowedForType(schemaType, char) {
  if (!char || char.length === 0) return true
  const c = char[0]
  switch (schemaType) {
    case 'text':
      return /[a-zA-Z\s.-]/.test(c)
    case 'alphanumeric':
      return /[a-zA-Z0-9\s.-]/.test(c)
    case 'number':
      return /[0-9.]/.test(c)
    default:
      return true
  }
}
