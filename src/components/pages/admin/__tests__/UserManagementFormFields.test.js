/**
 * Tests for UserManagement form - schema-driven field types across all sections.
 * Verifies that text, alphanumeric, and number types filter input correctly.
 */
import { describe, it, expect } from 'vitest'
import { filterValueByType } from '../../../../utils/fieldTypeValidation'
import { SECTION_ID_MAP, resolveFieldType } from '../../../../utils/formConfigHelpers'

/** Mock config covering all sections with representative field types */
const fullMockConfig = {
  sections: [
    { id: 'basic-info', fields: [{ name: 'firstName', type: 'text' }, { name: 'lastName', type: 'text' }] },
    { id: 'contact-info', fields: [{ name: 'email', type: 'email' }, { name: 'emergencyContactName', type: 'text' }] },
    { id: 'address-info', fields: [{ name: 'presentAddress.line1', type: 'alphanumeric' }, { name: 'presentAddress.pincode', type: 'alphanumeric' }, { name: 'presentAddress.district', type: 'text' }] },
    { id: 'family-details', fields: [{ name: 'name', type: 'text' }, { name: 'relation', type: 'text' }] },
    { id: 'employment-info', fields: [{ name: 'employeeId', type: 'alphanumeric' }, { name: 'designation', type: 'text' }, { name: 'costCenter', type: 'alphanumeric' }, { name: 'salary', type: 'number' }] },
    { id: 'education-details', fields: [{ name: 'institute', type: 'text' }, { name: 'percentage', type: 'number' }] },
    { id: 'bank-details', fields: [{ name: 'accountNumber', type: 'alphanumeric' }, { name: 'ifscCode', type: 'alphanumeric' }, { name: 'bankName', type: 'text' }] },
    { id: 'pf-details', fields: [{ name: 'pfNumber', type: 'number' }, { name: 'universalAccountNumber', type: 'number' }, { name: 'salary', type: 'number' }] },
    { id: 'esi-details', fields: [{ name: 'esiNumber', type: 'number' }] }
  ]
}

describe('UserManagement form - all sections field types', () => {
  describe('Section coverage', () => {
    it('all form sections have mapping', () => {
      const sectionIds = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 16]
      sectionIds.forEach(id => {
        expect(SECTION_ID_MAP[id]).toBeTruthy()
      })
    })
  })

  describe('Basic Info (1)', () => {
    it('firstName (text) accepts only alphabets', () => {
      const t = resolveFieldType(fullMockConfig, 1, 'firstName', 'text')
      expect(t).toBe('text')
      expect(filterValueByType(t, 'John123')).toBe('John')
      expect(filterValueByType(t, 'Mary-Jane')).toBe('Mary-Jane')
    })
  })

  describe('Contact (12)', () => {
    it('emergencyContactName (text) accepts only alphabets', () => {
      const t = resolveFieldType(fullMockConfig, 12, 'emergencyContactName', 'text')
      expect(t).toBe('text')
      expect(filterValueByType(t, 'John Doe')).toBe('John Doe')
      expect(filterValueByType(t, 'Call 911')).toBe('Call ')
    })
  })

  describe('Address (16)', () => {
    it('presentAddress.line1 (alphanumeric) accepts letters and numbers', () => {
      const t = resolveFieldType(fullMockConfig, 16, 'presentAddress.line1', 'alphanumeric')
      expect(t).toBe('alphanumeric')
      expect(filterValueByType(t, '123 Main St')).toBe('123 Main St')
      expect(filterValueByType(t, 'Apt #4B')).toBe('Apt 4B')
    })
    it('presentAddress.pincode (alphanumeric) accepts letters and numbers', () => {
      const t = resolveFieldType(fullMockConfig, 16, 'presentAddress.pincode', 'alphanumeric')
      expect(t).toBe('alphanumeric')
      expect(filterValueByType(t, 'SW1A 1AA')).toBe('SW1A 1AA')
      expect(filterValueByType(t, '560001')).toBe('560001')
    })
    it('presentAddress.district (text) accepts only alphabets', () => {
      const t = resolveFieldType(fullMockConfig, 16, 'presentAddress.district', 'text')
      expect(t).toBe('text')
      expect(filterValueByType(t, 'Bangalore')).toBe('Bangalore')
      expect(filterValueByType(t, 'City123')).toBe('City')
    })
  })

  describe('Family Details (13)', () => {
    it('name (text) accepts only alphabets', () => {
      const t = resolveFieldType(fullMockConfig, 13, 'name', 'text')
      expect(t).toBe('text')
      expect(filterValueByType(t, 'Jane Doe')).toBe('Jane Doe')
    })
  })

  describe('Employment (2)', () => {
    it('employeeId (alphanumeric) accepts letters and numbers', () => {
      const t = resolveFieldType(fullMockConfig, 2, 'employeeId', 'alphanumeric')
      expect(t).toBe('alphanumeric')
      expect(filterValueByType(t, 'EMP001')).toBe('EMP001')
      expect(filterValueByType(t, 'E-12345')).toBe('E-12345')
    })
    it('designation (text) accepts only alphabets', () => {
      const t = resolveFieldType(fullMockConfig, 2, 'designation', 'text')
      expect(t).toBe('text')
      expect(filterValueByType(t, 'Senior Engineer')).toBe('Senior Engineer')
    })
    it('costCenter (alphanumeric) accepts letters and numbers', () => {
      const t = resolveFieldType(fullMockConfig, 2, 'costCenter', 'alphanumeric')
      expect(t).toBe('alphanumeric')
      expect(filterValueByType(t, 'CC-100')).toBe('CC-100')
    })
    it('salary (number) accepts only digits', () => {
      const t = resolveFieldType(fullMockConfig, 2, 'salary', 'number')
      expect(t).toBe('number')
      expect(filterValueByType(t, '50000')).toBe('50000')
      expect(filterValueByType(t, '50K')).toBe('50')
    })
  })

  describe('Education (3)', () => {
    it('institute (text) accepts only alphabets', () => {
      const t = resolveFieldType(fullMockConfig, 3, 'institute', 'text')
      expect(t).toBe('text')
      expect(filterValueByType(t, 'MIT')).toBe('MIT')
    })
    it('percentage (number) accepts only digits', () => {
      const t = resolveFieldType(fullMockConfig, 3, 'percentage', 'number')
      expect(t).toBe('number')
      expect(filterValueByType(t, '85.5')).toBe('85.5')
      expect(filterValueByType(t, 'A+')).toBe('')
    })
  })

  describe('Bank Details (4)', () => {
    it('accountNumber (alphanumeric) accepts letters and numbers', () => {
      const t = resolveFieldType(fullMockConfig, 4, 'accountNumber', 'alphanumeric')
      expect(t).toBe('alphanumeric')
      expect(filterValueByType(t, '1234567890')).toBe('1234567890')
      expect(filterValueByType(t, 'ACC123XYZ')).toBe('ACC123XYZ')
    })
    it('ifscCode (alphanumeric) accepts letters and numbers', () => {
      const t = resolveFieldType(fullMockConfig, 4, 'ifscCode', 'alphanumeric')
      expect(t).toBe('alphanumeric')
      expect(filterValueByType(t, 'HDFC0001234')).toBe('HDFC0001234')
    })
    it('bankName (text) accepts only alphabets', () => {
      const t = resolveFieldType(fullMockConfig, 4, 'bankName', 'text')
      expect(t).toBe('text')
      expect(filterValueByType(t, 'HDFC Bank')).toBe('HDFC Bank')
      expect(filterValueByType(t, 'SBI 123')).toBe('SBI ')
    })
  })

  describe('PF Details (6)', () => {
    it('pfNumber (number) accepts only digits', () => {
      const t = resolveFieldType(fullMockConfig, 6, 'pfNumber', 'number')
      expect(t).toBe('number')
      expect(filterValueByType(t, '123456789012', { integerOnly: true })).toBe('123456789012')
    })
    it('universalAccountNumber (number) accepts only digits', () => {
      const t = resolveFieldType(fullMockConfig, 6, 'universalAccountNumber', 'number')
      expect(t).toBe('number')
      expect(filterValueByType(t, '123456789012', { integerOnly: true })).toBe('123456789012')
    })
  })

  describe('ESI Details (7)', () => {
    it('esiNumber (number) accepts only digits', () => {
      const t = resolveFieldType(fullMockConfig, 7, 'esiNumber', 'number')
      expect(t).toBe('number')
      expect(filterValueByType(t, '1234567890', { integerOnly: true })).toBe('1234567890')
    })
  })
})
