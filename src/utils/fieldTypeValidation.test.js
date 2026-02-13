import { describe, it, expect } from 'vitest'
import { filterValueByType, isCharAllowedForType } from './fieldTypeValidation'

describe('fieldTypeValidation', () => {
  describe('filterValueByType', () => {
    describe('text type', () => {
      it('allows alphabets and spaces', () => {
        expect(filterValueByType('text', 'John Doe')).toBe('John Doe')
        expect(filterValueByType('text', 'ABC')).toBe('ABC')
      })

      it('allows dots and hyphens', () => {
        expect(filterValueByType('text', 'O.Brien')).toBe('O.Brien')
        expect(filterValueByType('text', 'Mary-Jane')).toBe('Mary-Jane')
      })

      it('strips numbers', () => {
        expect(filterValueByType('text', 'John123')).toBe('John')
        expect(filterValueByType('text', '123')).toBe('')
        expect(filterValueByType('text', 'AB12CD')).toBe('ABCD')
      })

      it('strips special characters except . and -', () => {
        expect(filterValueByType('text', 'John@Doe')).toBe('JohnDoe')
        expect(filterValueByType('text', 'Test!')).toBe('Test')
      })
    })

    describe('alphanumeric type', () => {
      it('allows alphabets and numbers', () => {
        expect(filterValueByType('alphanumeric', 'John123')).toBe('John123')
        expect(filterValueByType('alphanumeric', 'IFSC1234ABCD')).toBe('IFSC1234ABCD')
        expect(filterValueByType('alphanumeric', 'Acc123456')).toBe('Acc123456')
      })

      it('allows spaces, dots, hyphens', () => {
        expect(filterValueByType('alphanumeric', 'A1 B2')).toBe('A1 B2')
        expect(filterValueByType('alphanumeric', 'ABC.123')).toBe('ABC.123')
      })

      it('strips special characters', () => {
        expect(filterValueByType('alphanumeric', 'Test@123')).toBe('Test123')
        expect(filterValueByType('alphanumeric', 'Acc#456')).toBe('Acc456')
      })
    })

    describe('number type', () => {
      it('allows digits and single decimal by default', () => {
        expect(filterValueByType('number', '12345')).toBe('12345')
        expect(filterValueByType('number', '0')).toBe('0')
        expect(filterValueByType('number', '12.34')).toBe('12.34')
      })

      it('prevents multiple decimal points', () => {
        expect(filterValueByType('number', '12.34.56')).toBe('12.3456')
      })

      it('strips letters', () => {
        expect(filterValueByType('number', '123ABC')).toBe('123')
        expect(filterValueByType('number', 'ABC')).toBe('')
      })

      it('integerOnly strips decimals', () => {
        expect(filterValueByType('number', '12.34', { integerOnly: true })).toBe('1234')
        expect(filterValueByType('number', '123', { integerOnly: true })).toBe('123')
      })

      it('allowPercent preserves %', () => {
        expect(filterValueByType('number', '75%', { allowPercent: true })).toBe('75%')
      })
    })
  })

  describe('isCharAllowedForType', () => {
    it('text: allows a-z, A-Z, space, ., -', () => {
      expect(isCharAllowedForType('text', 'a')).toBe(true)
      expect(isCharAllowedForType('text', 'Z')).toBe(true)
      expect(isCharAllowedForType('text', ' ')).toBe(true)
      expect(isCharAllowedForType('text', '.')).toBe(true)
      expect(isCharAllowedForType('text', '-')).toBe(true)
      expect(isCharAllowedForType('text', '1')).toBe(false)
      expect(isCharAllowedForType('text', '@')).toBe(false)
    })

    it('alphanumeric: allows letters and digits', () => {
      expect(isCharAllowedForType('alphanumeric', 'a')).toBe(true)
      expect(isCharAllowedForType('alphanumeric', '5')).toBe(true)
      expect(isCharAllowedForType('alphanumeric', ' ')).toBe(true)
      expect(isCharAllowedForType('alphanumeric', '@')).toBe(false)
    })

    it('number: allows 0-9 and .', () => {
      expect(isCharAllowedForType('number', '5')).toBe(true)
      expect(isCharAllowedForType('number', '.')).toBe(true)
      expect(isCharAllowedForType('number', 'a')).toBe(false)
    })
  })
})
