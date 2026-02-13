/**
 * Tests for schema-driven required field validation across the whole form.
 * Verifies that the required checkbox in Form Schema Editor applies correctly.
 */
import { describe, it, expect } from 'vitest'
import { resolveFieldRequired } from './formConfigHelpers'

/** Mock config with required fields set */
const mockConfig = {
  sections: [
    { id: 'basic-info', fields: [{ name: 'firstName', required: true }, { name: 'lastName', required: true }, { name: 'middleName', required: false }] },
    { id: 'employment-info', fields: [{ name: 'employeeId', required: true }, { name: 'role', required: true }] },
    { id: 'bank-details', fields: [{ name: 'accountNumber', required: true }, { name: 'bankName', required: false }] },
    { id: 'contact-info', fields: [{ name: 'email', required: false }, { name: 'emergencyContactName', required: true }] },
    { id: 'address-info', fields: [{ name: 'presentAddress.line1', required: true }, { name: 'presentAddress.pincode', required: false }] },
    { id: 'family-details', fields: [{ name: 'name', required: true }, { name: 'relation', required: true }, { name: 'dob', required: false }] },
    { id: 'education-details', fields: [{ name: 'institute', required: true }, { name: 'degree', required: false }, { name: 'percentage', required: true }] },
    { id: 'documents', fields: [{ name: 'documentType', required: true }, { name: 'documentNumber', required: true }] },
    { id: 'pf-details', fields: [{ name: 'pfNumber', required: false }] }
  ]
}

describe('required field validation - whole form', () => {
  describe('resolveFieldRequired', () => {
    it('returns true when schema has required: true', () => {
      expect(resolveFieldRequired(mockConfig, 1, 'firstName', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 1, 'lastName', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 2, 'employeeId', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 4, 'accountNumber', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 12, 'emergencyContactName', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 16, 'presentAddress.line1', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 13, 'name', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 13, 'relation', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 3, 'institute', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 3, 'percentage', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 5, 'documentType', false)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 5, 'documentNumber', false)).toBe(true)
    })

    it('returns false when schema has required: false', () => {
      expect(resolveFieldRequired(mockConfig, 1, 'middleName', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 4, 'bankName', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 12, 'email', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 16, 'presentAddress.pincode', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 13, 'dob', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 3, 'degree', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 6, 'pfNumber', false)).toBe(false)
    })

    it('returns defaultValue when field not in schema', () => {
      expect(resolveFieldRequired(mockConfig, 1, 'unknownField', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 1, 'unknownField', true)).toBe(true)
      expect(resolveFieldRequired(mockConfig, 4, 'branchName', false)).toBe(false)
    })

    it('normalizes string "true" and "false"', () => {
      const configWithStrings = {
        sections: [{ id: 'basic-info', fields: [{ name: 'f1', required: 'true' }, { name: 'f2', required: 'false' }] }]
      }
      expect(resolveFieldRequired(configWithStrings, 1, 'f1', false)).toBe(true)
      expect(resolveFieldRequired(configWithStrings, 1, 'f2', true)).toBe(false)
    })

    it('normalizes number 1 and 0', () => {
      const configWithNumbers = {
        sections: [{ id: 'basic-info', fields: [{ name: 'f1', required: 1 }, { name: 'f2', required: 0 }] }]
      }
      expect(resolveFieldRequired(configWithNumbers, 1, 'f1', false)).toBe(true)
      expect(resolveFieldRequired(configWithNumbers, 1, 'f2', true)).toBe(false)
    })

    it('returns defaultValue for unknown section', () => {
      expect(resolveFieldRequired(mockConfig, 99, 'any', false)).toBe(false)
      expect(resolveFieldRequired(mockConfig, 99, 'any', true)).toBe(true)
    })
  })

  describe('form section coverage', () => {
    const sectionIds = [1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 16]
    it('all form sections can resolve required', () => {
      sectionIds.forEach(sectionId => {
        const result = resolveFieldRequired(mockConfig, sectionId, 'anyField', false)
        expect(typeof result).toBe('boolean')
      })
    })
  })
})
