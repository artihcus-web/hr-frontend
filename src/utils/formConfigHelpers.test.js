import { describe, it, expect } from 'vitest'
import {
  SECTION_ID_MAP,
  ALL_SECTION_IDS,
  getSectionKey,
  getFieldConfig,
  resolveFieldType
} from './formConfigHelpers'

/** Mock employee form config (subset matching real schema structure) */
const mockFormConfig = {
  sections: [
    { id: 'basic-info', fields: [{ name: 'firstName', type: 'text' }, { name: 'employeeName', type: 'text' }] },
    { id: 'employment-info', fields: [{ name: 'employeeId', type: 'alphanumeric' }, { name: 'designation', type: 'text' }, { name: 'salary', type: 'number' }] },
    { id: 'bank-details', fields: [{ name: 'accountNumber', type: 'alphanumeric' }, { name: 'ifscCode', type: 'alphanumeric' }, { name: 'bankName', type: 'text' }] },
    { id: 'address-info', fields: [{ name: 'presentAddress.line1', type: 'alphanumeric' }, { name: 'presentAddress.pincode', type: 'alphanumeric' }] },
    { id: 'pf-details', fields: [{ name: 'pfNumber', type: 'number' }, { name: 'universalAccountNumber', type: 'number' }] },
    { id: 'contact-info', fields: [{ name: 'email', type: 'email' }, { name: 'emergencyContactName', type: 'text' }] },
    { id: 'family-details', fields: [{ name: 'name', type: 'text' }, { name: 'relation', type: 'text' }] }
  ]
}

describe('formConfigHelpers', () => {
  describe('SECTION_ID_MAP', () => {
    it('has all required section IDs', () => {
      expect(SECTION_ID_MAP[1]).toBe('basic-info')
      expect(SECTION_ID_MAP[2]).toBe('employment-info')
      expect(SECTION_ID_MAP[4]).toBe('bank-details')
      expect(SECTION_ID_MAP[16]).toBe('address-info')
    })

    it('covers all form sections', () => {
      const expected = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 16]
      expected.forEach(id => expect(getSectionKey(id)).toBeTruthy())
    })
  })

  describe('getSectionKey', () => {
    it('returns correct key for known section IDs', () => {
      expect(getSectionKey(1)).toBe('basic-info')
      expect(getSectionKey(4)).toBe('bank-details')
      expect(getSectionKey(16)).toBe('address-info')
    })
    it('returns null for unknown section ID', () => {
      expect(getSectionKey(99)).toBeNull()
    })
  })

  describe('getFieldConfig', () => {
    it('returns field config when exists', () => {
      const field = getFieldConfig(mockFormConfig, 'bank-details', 'accountNumber')
      expect(field).toEqual({ name: 'accountNumber', type: 'alphanumeric' })
    })
    it('returns null when field not found', () => {
      expect(getFieldConfig(mockFormConfig, 'bank-details', 'unknown')).toBeNull()
    })
    it('returns null when section not found', () => {
      expect(getFieldConfig(mockFormConfig, 'invalid-section', 'accountNumber')).toBeNull()
    })
  })

  describe('resolveFieldType', () => {
    it('returns schema type for known fields', () => {
      expect(resolveFieldType(mockFormConfig, 4, 'accountNumber', 'text')).toBe('alphanumeric')
      expect(resolveFieldType(mockFormConfig, 4, 'ifscCode', 'text')).toBe('alphanumeric')
      expect(resolveFieldType(mockFormConfig, 4, 'bankName', 'text')).toBe('text')
      expect(resolveFieldType(mockFormConfig, 6, 'pfNumber', 'number')).toBe('number')
      expect(resolveFieldType(mockFormConfig, 12, 'email', 'email')).toBe('email')
    })
    it('handles nested field names (address)', () => {
      expect(resolveFieldType(mockFormConfig, 16, 'presentAddress.line1', 'text')).toBe('alphanumeric')
      expect(resolveFieldType(mockFormConfig, 16, 'presentAddress.pincode', 'alphanumeric')).toBe('alphanumeric')
    })
    it('returns defaultValue when field not in schema', () => {
      expect(resolveFieldType(mockFormConfig, 4, 'unknownField', 'text')).toBe('text')
      // branchName not in mock - uses default
      expect(resolveFieldType(mockFormConfig, 4, 'branchName', 'alphanumeric')).toBe('alphanumeric')
    })
    it('normalizes type variations', () => {
      const configWithVariations = { sections: [{ id: 'basic-info', fields: [{ name: 'f1', type: 'STRING' }, { name: 'f2', type: 'NUMERIC' }, { name: 'f3', type: 'Alphanumeric' }] }] }
      expect(resolveFieldType(configWithVariations, 1, 'f1', 'text')).toBe('text')
      expect(resolveFieldType(configWithVariations, 1, 'f2', 'number')).toBe('number')
      expect(resolveFieldType(configWithVariations, 1, 'f3', 'text')).toBe('alphanumeric')
    })
    it('returns defaultValue for unknown section', () => {
      expect(resolveFieldType(mockFormConfig, 99, 'any', 'alphanumeric')).toBe('alphanumeric')
    })
  })
})
