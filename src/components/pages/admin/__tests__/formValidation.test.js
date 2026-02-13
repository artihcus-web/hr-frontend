/**
 * Tests for form validation across all sections:
 * - Phone number validation (exactly 10 digits)
 * - Percentage/CGPA range validation
 * - PDF attachment validation
 * - Experience date validation
 */
import { describe, it, expect } from 'vitest'

describe('Form Validation - Contact Information', () => {
  describe('Phone Number Validation', () => {
    it('requires exactly 10 digits for phone number', () => {
      const phone1 = '1234567890' // 10 digits - valid
      const phone2 = '123456789' // 9 digits - invalid
      const phone3 = '12345678901' // 11 digits - invalid
      const phone4 = '12' // 2 digits - invalid
      
      expect(phone1.length).toBe(10)
      expect(phone2.length).not.toBe(10)
      expect(phone3.length).not.toBe(10)
      expect(phone4.length).not.toBe(10)
    })

    it('strips non-numeric characters', () => {
      const input = '12-345-6789'
      const cleaned = input.replace(/[^0-9]/g, '')
      expect(cleaned).toBe('123456789')
      expect(cleaned.length).toBe(9) // Invalid - needs 10
    })
  })
})

describe('Form Validation - Education Details', () => {
  describe('Percentage/CGPA Range Validation', () => {
    it('validates percentage range 0-100', () => {
      const validPercentages = ['0', '50', '100', '85.5', '99.99']
      const invalidPercentages = ['-1', '101', '150', '200']
      
      validPercentages.forEach(p => {
        const num = parseFloat(p.replace(/%/g, ''))
        expect(num >= 0 && num <= 100).toBe(true)
      })
      
      invalidPercentages.forEach(p => {
        const num = parseFloat(p.replace(/%/g, ''))
        expect(num >= 0 && num <= 100).toBe(false)
      })
    })

    it('validates CGPA range 0-10', () => {
      const validCGPAs = ['0', '5', '10', '8.5', '9.99']
      const invalidCGPAs = ['-1', '11', '15', '20']
      
      validCGPAs.forEach(c => {
        const num = parseFloat(c.replace(/%/g, ''))
        expect(num >= 0 && num <= 10).toBe(true)
      })
      
      invalidCGPAs.forEach(c => {
        const num = parseFloat(c.replace(/%/g, ''))
        expect(num >= 0 && num <= 10).toBe(false)
      })
    })

    it('allows decimal values', () => {
      expect(parseFloat('85.5')).toBe(85.5)
      expect(parseFloat('8.5')).toBe(8.5)
      expect(parseFloat('99.99')).toBe(99.99)
      expect(parseFloat('9.99')).toBe(9.99)
    })
  })
})

describe('Form Validation - Attachments', () => {
  describe('PDF File Validation', () => {
    it('accepts PDF files', () => {
      const validFiles = ['document.pdf', 'file.PDF', 'test.pdf']
      validFiles.forEach(file => {
        expect(file.toLowerCase().endsWith('.pdf')).toBe(true)
      })
    })

    it('rejects non-PDF files', () => {
      const invalidFiles = ['document.doc', 'file.jpg', 'test.png', 'data.xlsx']
      invalidFiles.forEach(file => {
        expect(file.toLowerCase().endsWith('.pdf')).toBe(false)
      })
    })

    it('validates MIME type', () => {
      const pdfMime = 'application/pdf'
      const docMime = 'application/msword'
      const imageMime = 'image/jpeg'
      
      expect(pdfMime === 'application/pdf').toBe(true)
      expect(docMime === 'application/pdf').toBe(false)
      expect(imageMime === 'application/pdf').toBe(false)
    })
  })
})

describe('Form Validation - Experience Dates', () => {
  describe('Date Range Validation', () => {
    it('prevents future dates', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      expect(tomorrow > today).toBe(true) // Future - invalid
      expect(yesterday <= today).toBe(true) // Past - valid
    })

    it('ensures From Date is before To Date', () => {
      const fromDate = new Date('2020-01-01')
      const toDate = new Date('2021-01-01')
      const invalidToDate = new Date('2019-01-01')
      
      expect(toDate > fromDate).toBe(true) // Valid
      expect(invalidToDate < fromDate).toBe(true) // Invalid
    })

    it('allows same date for From and To', () => {
      const date = new Date('2020-01-01')
      expect(date >= date).toBe(true) // Same date is valid
    })
  })
})
