/**
 * Pure helpers for form config - used by UserManagement and testable in isolation.
 */

/** Section ID to schema key mapping (matches UserManagement getSectionKey) */
export const SECTION_ID_MAP = {
  1: 'basic-info',
  12: 'contact-info',
  16: 'address-info',
  13: 'family-details',
  2: 'employment-info',
  3: 'education-details',
  14: 'languages',
  10: 'experience-details',
  4: 'bank-details',
  5: 'documents',
  6: 'pf-details',
  7: 'esi-details',
  8: 'other-info'
}

/** All section IDs used in the form */
export const ALL_SECTION_IDS = Object.keys(SECTION_ID_MAP).map(Number)

/**
 * Get section key from section ID
 */
export function getSectionKey(sectionId) {
  return SECTION_ID_MAP[sectionId] ?? null
}

/**
 * Get field config from form config by section and field name
 */
export function getFieldConfig(formConfig, sectionKey, fieldName) {
  const section = formConfig?.sections?.find(s => s.id === sectionKey)
  if (!section?.fields) return null
  return section.fields.find(f => f.name === fieldName) ?? null
}

/**
 * Resolve field type from form config (normalized: text, number, alphanumeric, etc.)
 */
export function resolveFieldType(formConfig, sectionId, fieldName, defaultValue = 'text') {
  const sectionKey = getSectionKey(sectionId)
  if (!sectionKey) return defaultValue
  const field = getFieldConfig(formConfig, sectionKey, fieldName)
  const fieldType = field?.type || defaultValue
  const normalized = String(fieldType).toLowerCase().trim()
  if (normalized === 'text' || normalized === 'string') return 'text'
  if (normalized === 'number' || normalized === 'numeric') return 'number'
  if (normalized === 'alphanumeric' || normalized === 'alphanum') return 'alphanumeric'
  if (normalized === 'email') return 'email'
  if (normalized === 'date') return 'date'
  if (normalized === 'select' || normalized === 'checkbox' || normalized === 'textarea') return normalized
  return normalized || defaultValue
}
