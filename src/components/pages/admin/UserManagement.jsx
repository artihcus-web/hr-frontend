import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FiEdit2, FiTrash2, FiUpload, FiX, FiSearch, FiFilter, FiDownload, FiChevronDown, FiChevronUp, FiSave, FiPlus, FiMoreVertical, FiEye } from 'react-icons/fi'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { countryCodes } from '../../../utils/countryCodes'
import axiosInstance from '../../../utils/axiosInstance'
import { getProfileImageUrl } from '../../../config/apiConfig'
import LoadingSpinner from '../../common/LoadingSpinner'

const roles = ['admin', 'c-suite', 'hr', 'manager', 'supermanager', 'tl', 'employee', 'client']

const genders = ['Male', 'Female', 'Other']
const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed']
const accountTypes = ['Savings', 'Current']
const paymentModes = ['Bank Transfer', 'Cheque', 'Cash']

// Complete list of countries
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea, North', 'Korea, South', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela',
  'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
]

// const sections = [ // Removed unused
//   { id: 1, title: 'Basic Information', slug: 'basic' },
//   { id: 2, title: 'Employment', slug: 'employment' },
//   { id: 3, title: 'Professional', slug: 'professional' },
//   { id: 4, title: 'Bank Details', slug: 'bank' },
//   { id: 5, title: 'Documents', slug: 'documents' },
//   { id: 6, title: 'Verification', slug: 'verification' },
//   { id: 7, title: 'PF Details', slug: 'pf' },
//   { id: 8, title: 'ESI Details', slug: 'esi' },
//   { id: 9, title: 'Account Setup', slug: 'account' }
// ]

// FormField component - moved outside to prevent re-creation on every render
const FormField = ({ label, name, type = 'text', required, formData, handleChange, options = [], placeholder, otherOptionLabel = 'Please specify', ...props }) => {
  // Helper to get nested value (supports dot notation and array indices)
  const getValue = (obj, path) => {
    if (!path || !obj) return ''
    if (path.includes('.')) {
      return path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) return null
        // Handle numeric array indices
        const numPart = parseInt(part, 10)
        if (!isNaN(numPart) && Array.isArray(acc)) {
          return acc[numPart]
        }
        return acc[part]
      }, obj) || ''
    }
    return obj[path] || ''
  }

  const value = getValue(formData, name)
  const hasOtherOption = options.some(opt => opt && String(opt).toLowerCase().includes('other'))
  const isOtherSelected = value && String(value).toLowerCase().includes('other')
  const otherFieldName = `${name}Other`
  const otherValue = getValue(formData, otherFieldName)

  // Detect field type for special validation based on schema type and field name
  // Normalize and map type variations
  let normalizedType = String(type || 'text').toLowerCase().trim()
  if (normalizedType === 'string') normalizedType = 'text'
  if (normalizedType === 'numeric') normalizedType = 'number'
  if (normalizedType === 'alphanum') normalizedType = 'alphanumeric'
  
  const isCityField = name.includes('district') || name.includes('city') || (label && label.toLowerCase().includes('city'))
  const isPincodeField = name.includes('pincode') || name.includes('zip') || (label && (label.toLowerCase().includes('zip') || label.toLowerCase().includes('postal')))
  const isCountryField = name.includes('country') || (label && label.toLowerCase().includes('country'))
  const isAccountNumberField = name.includes('accountNumber') && !name.includes('confirm')
  const isPercentageField = name.includes('percentage') || (label && (label.toLowerCase().includes('percentage') || label.toLowerCase().includes('cgpa')))
  // Year-only numeric fields (e.g. "From Year", "To Year")
  const isYearOnlyField =
    (name && name.toLowerCase().includes('year')) ||
    (label && label.toLowerCase().includes('year'))
  const isPhoneType = normalizedType === 'phone'
  const isEmailType = normalizedType === 'email'
  
  // Schema-driven type validation
  // Text type: only alphabets, spaces, and valid special characters (no numbers)
  // Also check common text field names as fallback (firstName, lastName, middleName, etc.)
  const isCommonTextField = ['firstName', 'lastName', 'middleName', 'employeeName', 'name'].includes(name)
  const isTextType = (normalizedType === 'text' || (isCommonTextField && normalizedType !== 'number' && normalizedType !== 'alphanumeric')) && !isCityField && !isPincodeField && !isCountryField && !isAccountNumberField && !isPercentageField
  // Alphanumeric type: allows both alphabets and numbers
  const isAlphanumericType = normalizedType === 'alphanumeric' && !isCityField && !isPincodeField && !isCountryField && !isAccountNumberField && !isPercentageField
  // Number type: only numeric digits
  const isNumberType = normalizedType === 'number' && !isPercentageField

  // Debug logging for text fields
  if (name === 'firstName' || name === 'lastName' || name === 'middleName') {
    console.log('🔍 FormField Debug:', {
      name,
      type,
      normalizedType,
      isTextType,
      isAlphanumericType,
      isNumberType,
      isCommonTextField,
      isCityField,
      isPincodeField,
      isCountryField,
      isAccountNumberField,
      isPercentageField,
      value: value || '(empty)'
    })
  }

  return (
    <div className="flex flex-col">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'select' ? (
        <div className="flex flex-col gap-1">
          {hasOtherOption && isOtherSelected ? (
            <>
              <input
                type="text"
                name={otherFieldName}
                value={otherValue}
                onChange={(e) => {
                  // For relationship "Other", only allow alphabets and spaces
                  if (name.includes('relation')) {
                    const filteredValue = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    handleChange({ ...e, target: { ...e.target, name: otherFieldName, value: filteredValue } })
                  } else {
                    handleChange(e)
                  }
                }}
                onKeyPress={(e) => {
                  if (name.includes('relation')) {
                    const char = String.fromCharCode(e.which)
                    if (!/[a-zA-Z\s]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                      e.preventDefault()
                    }
                  }
                }}
                onPaste={(e) => {
                  if (name.includes('relation')) {
                    e.preventDefault()
                    const pastedText = e.clipboardData.getData('text')
                    const filteredValue = pastedText.replace(/[^a-zA-Z\s]/g, '')
                    handleChange({ target: { name: otherFieldName, value: filteredValue, type: 'text' } })
                  }
                }}
                placeholder={otherOptionLabel}
                required={required}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                aria-label={otherOptionLabel}
              />
              <button
                type="button"
                onClick={() => handleChange({ target: { name, value: '', type: 'text' } })}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline text-left"
              >
                Choose from list
              </button>
            </>
          ) : (
            <select
              name={name}
              value={value}
              onChange={handleChange}
              required={required}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
              {...props}
            >
              <option value="">Select {label}</option>
              {options.map((opt, index) => (
                <option key={index} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : type === 'checkbox' ? (
        <div className="flex items-center">
          <input
            type="checkbox"
            name={name}
            checked={value === true}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded transition-colors"
          />
          <label className="ml-2 text-xs text-gray-700 dark:text-gray-300">{label}</label>
        </div>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          rows={2}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : type === 'number' ? (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9.]*"
          name={name}
          value={value}
          onChange={(e) => {
            // Filter out non-numeric characters (allow digits and decimal point)
            let filteredValue = e.target.value.replace(/[^0-9.]/g, '')
            // Prevent multiple decimal points
            const parts = filteredValue.split('.')
            filteredValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredValue
            // For year-only fields, enforce max 4 digits and no decimal
            if (isYearOnlyField) {
              filteredValue = filteredValue.replace(/\./g, '').slice(0, 4)
            }
            
            // For percentage/CGPA fields, validate range
            if (isPercentageField && filteredValue) {
              const numValue = parseFloat(filteredValue)
              const isCGPA = label && label.toLowerCase().includes('cgpa')
              const maxValue = isCGPA ? 10 : 100
              if (!isNaN(numValue) && numValue > maxValue) {
                filteredValue = maxValue.toString()
                toast.error(isCGPA ? `CGPA must be between 0 and ${maxValue}` : `Percentage must be between 0 and ${maxValue}`)
              }
            }
            
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyPress={(e) => {
            // Only allow digits, decimal point, and backspace/delete/arrow keys
            const char = String.fromCharCode(e.which)
            if (!/[0-9.]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
              e.preventDefault()
            }
            // Prevent multiple decimal points
            if (!isYearOnlyField && char === '.' && e.target.value.includes('.')) {
              e.preventDefault()
            }
            // Enforce 4 digits max for year-only fields
            if (isYearOnlyField && e.target.value.length >= 4 && e.key !== 'Backspace' && e.key !== 'Delete') {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            // Filter out non-numeric characters
            let filteredValue = pastedText.replace(/[^0-9.]/g, '')
            const parts = filteredValue.split('.')
            filteredValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredValue
            if (isYearOnlyField) {
              filteredValue = filteredValue.replace(/\./g, '').slice(0, 4)
            }
            
            // Validate range for percentage/CGPA
            if (isPercentageField && filteredValue) {
              const numValue = parseFloat(filteredValue)
              const isCGPA = label && label.toLowerCase().includes('cgpa')
              const maxValue = isCGPA ? 10 : 100
              if (!isNaN(numValue) && numValue > maxValue) {
                filteredValue = maxValue.toString()
                toast.error(isCGPA ? `CGPA must be between 0 and ${maxValue}` : `Percentage must be between 0 and ${maxValue}`)
              }
            }
            
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          required={required}
          placeholder={placeholder || (isPercentageField ? (label && label.toLowerCase().includes('cgpa') ? '0-10' : '0-100') : '')}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isCountryField ? (
        <select
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
          {...props}
        >
          <option value="">Select Country</option>
          {countries.map((country, index) => (
            <option key={index} value={country}>
              {country}
            </option>
          ))}
        </select>
      ) : isCityField ? (
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            // Only allow alphabets, spaces, hyphens, dots, and commas
            const filteredValue = e.target.value.replace(/[^a-zA-Z\s\-.,]/g, '')
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyPress={(e) => {
            const char = String.fromCharCode(e.which)
            if (!/[a-zA-Z\s\-.,]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            const filteredValue = pastedText.replace(/[^a-zA-Z\s\-.,]/g, '')
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isPincodeField ? (
        <input
          type="text"
          inputMode="numeric"
          name={name}
          value={value}
          onChange={(e) => {
            // Only allow 6 digits
            const filteredValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyPress={(e) => {
            const char = String.fromCharCode(e.which)
            if (!/[0-9]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
              e.preventDefault()
            }
            if (e.target.value.length >= 6 && e.key !== 'Backspace' && e.key !== 'Delete') {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            const filteredValue = pastedText.replace(/[^0-9]/g, '').slice(0, 6)
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          maxLength={6}
          required={required}
          placeholder={placeholder || '6-digit PIN code'}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isAccountNumberField ? (
        <input
          type="text"
          inputMode="numeric"
          name={name}
          value={value}
          onChange={(e) => {
            // Only allow numeric digits
            const filteredValue = e.target.value.replace(/[^0-9]/g, '')
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyPress={(e) => {
            const char = String.fromCharCode(e.which)
            if (!/[0-9]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            const filteredValue = pastedText.replace(/[^0-9]/g, '')
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isPhoneType ? (
        <input
          type="text"
          inputMode="numeric"
          name={name}
          value={value}
          onChange={(e) => {
            // Phone type: only digits, max 10 characters
            const filteredValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyPress={(e) => {
            const char = String.fromCharCode(e.which)
            // Block non-digits
            if (!/[0-9]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
              e.preventDefault()
              return
            }
            // Enforce max length 10 while typing
            if (e.target.value && e.target.value.length >= 10 && e.key !== 'Backspace' && e.key !== 'Delete') {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            const filteredValue = pastedText.replace(/[^0-9]/g, '').slice(0, 10)
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          onBlur={(e) => {
            const current = (e.target.value || '').trim()
            if (current && current.length !== 10) {
              toast.error('Phone number must be exactly 10 digits')
            }
          }}
          maxLength={10}
          required={required}
          placeholder={placeholder || '10-digit phone number'}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isEmailType ? (
        <input
          type="email"
          name={name}
          value={value}
          onChange={(e) => {
            // Trim spaces while typing
            const next = e.target.value.replace(/\s+/g, '')
            handleChange({ ...e, target: { ...e.target, value: next } })
          }}
          onBlur={(e) => {
            const current = (e.target.value || '').trim()
            if (!current) return
            const lower = current.toLowerCase()
            // Basic email shape check
            const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!basicEmailRegex.test(current)) {
              toast.error('Please enter a valid email address')
              return
            }
            // Enforce .com domain
            if (!lower.endsWith('.com')) {
              toast.error('Email must end with .com')
            }
          }}
          required={required}
          placeholder={placeholder || 'example@domain.com'}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isTextType ? (
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            console.log('📝 Text field onChange:', { name, originalValue: e.target.value })
            // Text type: only alphabets, spaces, and valid special characters (.,-&) - NO NUMBERS
            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,\-&]/g, '')
            console.log('📝 Text field filtered:', { name, filteredValue, removed: e.target.value !== filteredValue })
            // Create a proper event-like object for handleChange
            handleChange({
              target: {
                name: name,
                value: filteredValue,
                type: e.target.type || 'text',
                checked: e.target.checked
              }
            })
          }}
          onKeyDown={(e) => {
            const key = e.key
            console.log('⌨️ Text field onKeyDown:', { name, key, ctrlKey: e.ctrlKey, metaKey: e.metaKey })
            // Allow control keys and navigation keys
            if (e.ctrlKey || e.metaKey || e.altKey || 
                ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'].includes(key)) {
              console.log('⌨️ Allowed control/nav key:', key)
              return
            }
            // Block numbers (0-9) and other invalid characters
            if (/[0-9]/.test(key)) {
              console.log('🚫 Blocked number:', key)
              e.preventDefault()
              return
            }
            if (!/[a-zA-Z\s.,\-&]/.test(key) && key.length === 1) {
              console.log('🚫 Blocked invalid char:', key)
              e.preventDefault()
              return
            }
            console.log('✅ Allowed key:', key)
          }}
          onPaste={(e) => {
            console.log('📋 Text field onPaste:', { name })
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            const filteredValue = pastedText.replace(/[^a-zA-Z\s.,\-&]/g, '')
            console.log('📋 Paste filtered:', { pastedText, filteredValue })
            handleChange({
              target: {
                name: name,
                value: filteredValue,
                type: 'text',
                checked: false
              }
            })
          }}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isAlphanumericType ? (
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            // Alphanumeric type: allow alphabets, numbers, spaces, and common special characters
            const filteredValue = e.target.value.replace(/[^a-zA-Z0-9\s.,\-&]/g, '')
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyPress={(e) => {
            const char = String.fromCharCode(e.which)
            if (!/[a-zA-Z0-9\s.,\-&]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            const filteredValue = pastedText.replace(/[^a-zA-Z0-9\s.,\-&]/g, '')
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : isNumberType && !isPercentageField ? (
        <input
          type="text"
          inputMode="numeric"
          name={name}
          value={value}
          onChange={(e) => {
            // Number type: only numeric digits (no decimals unless percentage)
            let filteredValue = e.target.value.replace(/[^0-9]/g, '')
            // For year-only fields, enforce max 4 digits
            if (isYearOnlyField) {
              filteredValue = filteredValue.slice(0, 4)
            }
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyPress={(e) => {
            const char = String.fromCharCode(e.which)
            if (!/[0-9]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
              e.preventDefault()
            }
            if (isYearOnlyField && e.target.value.length >= 4 && e.key !== 'Backspace' && e.key !== 'Delete') {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            let filteredValue = pastedText.replace(/[^0-9]/g, '')
            if (isYearOnlyField) {
              filteredValue = filteredValue.slice(0, 4)
            }
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : normalizedType === 'date' ? (
        <input
          type="date"
          name={name}
          value={value}
          onChange={(e) => {
            const dateValue = e.target.value
            if (dateValue) {
              // Validate year is exactly 4 digits (YYYY-MM-DD format)
              const dateParts = dateValue.split('-')
              if (dateParts.length === 3) {
                const year = dateParts[0]
                // Ensure year is exactly 4 digits and within valid range
                if (year.length !== 4 || parseInt(year) < 1900 || parseInt(year) > 2100) {
                  toast.error('Please enter a valid date with 4-digit year (1900-2100)')
                  return
                }
              }
            }
            handleChange(e)
          }}
          onBlur={(e) => {
            // Additional validation on blur
            const dateValue = e.target.value
            if (dateValue) {
              const dateParts = dateValue.split('-')
              if (dateParts.length === 3) {
                const year = dateParts[0]
                if (year.length !== 4) {
                  toast.error('Year must be exactly 4 digits')
                  e.target.value = ''
                  handleChange({ target: { name, value: '', type: 'date' } })
                  return
                }

                // Extra rule for DOB fields: must be at least 18 years before today
                if (name === 'dateOfBirth' || name === 'birthdayDate') {
                  const selected = new Date(dateValue)
                  if (!isNaN(selected.getTime())) {
                    const today = new Date()
                    const minDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
                    // If selected date is after the minimum allowed DOB (i.e. younger than 18)
                    if (selected > minDob) {
                      toast.error('Date of Birth must be at least 18 years before today')
                      e.target.value = ''
                      handleChange({ target: { name, value: '', type: 'date' } })
                      return
                    }
                  }
                }
              }
            }
          }}
          required={required}
          placeholder={placeholder}
          min="1900-01-01"
          max="2100-12-31"
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : normalizedType === 'text' || normalizedType === 'string' ? (
        // Fallback: if type is text but didn't match isTextType (shouldn't happen, but safety check)
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            // Text type: only alphabets, spaces, and valid special characters (.,-&) - NO NUMBERS
            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,\-&]/g, '')
            handleChange({ ...e, target: { ...e.target, value: filteredValue } })
          }}
          onKeyDown={(e) => {
            // Prevent typing numbers and invalid characters
            const key = e.key
            // Allow control keys and navigation keys
            if (e.ctrlKey || e.metaKey || e.altKey || 
                ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'].includes(key)) {
              return
            }
            // Block numbers (0-9) and other invalid characters
            if (/[0-9]/.test(key) || (!/[a-zA-Z\s.,\-&]/.test(key) && key.length === 1)) {
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            const filteredValue = pastedText.replace(/[^a-zA-Z\s.,\-&]/g, '')
            handleChange({ target: { name, value: filteredValue, type: 'text' } })
          }}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      )}
    </div>
  )
}

// FormSection component - read-only until Edit is clicked; then fields and SAVE are enabled
const FormSection = ({ title, children, isOpen, onToggle, onSave, isSubmitting, sectionId, isEditMode, onEditClick, showEditButton = true }) => {
  const handleEditClick = (e) => {
    e.stopPropagation()
    if (!isOpen) onToggle()
    onEditClick?.(sectionId)
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-2 overflow-hidden shadow-sm transition-colors">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
        <button type="button" onClick={onToggle} className="flex-1 flex items-center justify-between text-left focus:outline-none">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {isOpen ? <FiChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" /> : <FiChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
        </button>
        {showEditButton && (
          <button
            type="button"
            onClick={handleEditClick}
            className="ml-2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors flex-shrink-0"
          >
            <FiEdit2 className="w-3.5 h-3.5" /> {isEditMode ? 'Editing' : 'Edit'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <fieldset disabled={!isEditMode} className={!isEditMode ? 'opacity-90' : ''}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {children}
            </div>
          </fieldset>
          {isEditMode && (
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={(e) => onSave(e, sectionId)}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'SAVE'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserManagement() {
  const navigate = useNavigate()
  const { user, token, loading } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [isNewEntry, setIsNewEntry] = useState(false) // Track if this is a fresh entry creation flow
  const [addFlowJustSaved, setAddFlowJustSaved] = useState(false) // After first section save we keep "add" UX (title + editable sections) until user leaves
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ total: 0, success: 0, failed: 0, errors: [] })
  const fileInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  // const [showFilters, setShowFilters] = useState(false) // Removed unused

  // Dynamic employee form schema (from CMS / Form Builder)
  const [employeeFormConfig, setEmployeeFormConfig] = useState(null)

  // Load employee form configuration from backend (CMS)
  useEffect(() => {
    if (!token) return

    const fetchEmployeeFormConfig = async () => {
      try {
        const res = await axiosInstance.get('/api/form-config/employee')
        setEmployeeFormConfig(res.data?.config || null)
      } catch (error) {
        // 404 means no config yet – fall back to hard-coded labels
        if (error.response?.status !== 404) {
          console.error('Error loading employee form configuration:', error)
        }
      }
    }

    fetchEmployeeFormConfig()
  }, [token])

  // Helpers to resolve section/field metadata from schema
  const getSectionConfig = useCallback(
    (sectionKey) => {
      if (!employeeFormConfig?.sections) return null
      return employeeFormConfig.sections.find((s) => s.id === sectionKey)
    },
    [employeeFormConfig]
  )

  const getSectionTitle = useCallback(
    (sectionKey, defaultTitle) => {
      const section = getSectionConfig(sectionKey)
      return section?.title || defaultTitle
    },
    [getSectionConfig]
  )

  const getFieldConfig = useCallback(
    (sectionKey, fieldName) => {
      const section = getSectionConfig(sectionKey)
      if (!section?.fields) return null
      return section.fields.find((f) => f.name === fieldName)
    },
    [getSectionConfig]
  )

  const isFieldVisible = useCallback(
    (sectionKey, fieldName) => {
      const field = getFieldConfig(sectionKey, fieldName)
      // If field not defined in schema, keep it visible by default
      if (!field) return true
      return field.isActive !== false
    },
    [getFieldConfig]
  )

  const getFieldLabel = useCallback(
    (sectionKey, fieldName, defaultLabel) => {
      const field = getFieldConfig(sectionKey, fieldName)
      return field?.label || defaultLabel
    },
    [getFieldConfig]
  )

  // Map numeric sectionId to schema section key
  const getSectionKey = useCallback((sectionId) => {
    const mapping = {
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
    return mapping[sectionId] || null
  }, [])

  // Helper to get section title by sectionId
  const getSectionTitleById = useCallback(
    (sectionId, defaultTitle) => {
      const sectionKey = getSectionKey(sectionId)
      if (!sectionKey) return defaultTitle
      return getSectionTitle(sectionKey, defaultTitle)
    },
    [getSectionKey, getSectionTitle]
  )

  // Helper to get field label by sectionId and fieldName
  const getFieldLabelById = useCallback(
    (sectionId, fieldName, defaultLabel) => {
      const sectionKey = getSectionKey(sectionId)
      if (!sectionKey) return defaultLabel
      return getFieldLabel(sectionKey, fieldName, defaultLabel)
    },
    [getSectionKey, getFieldLabel]
  )

  // Helper to check field visibility by sectionId and fieldName
  const isFieldVisibleById = useCallback(
    (sectionId, fieldName) => {
      const sectionKey = getSectionKey(sectionId)
      if (!sectionKey) return true // Default visible if no mapping
      return isFieldVisible(sectionKey, fieldName)
    },
    [getSectionKey, isFieldVisible]
  )

  // Helper to get field options from CMS schema by sectionId and fieldName
  const getFieldOptionsById = useCallback(
    (sectionId, fieldName, fallback = []) => {
      const sectionKey = getSectionKey(sectionId)
      if (!sectionKey) return fallback
      const field = getFieldConfig(sectionKey, fieldName)
      const opts = field?.options
      return Array.isArray(opts) && opts.length > 0 ? opts : fallback
    },
    [getSectionKey, getFieldConfig]
  )

  // Helper to get field required flag from CMS schema (so Schema Configuration drives required asterisk and validation)
  const getFieldRequiredById = useCallback(
    (sectionId, fieldName, defaultValue = false) => {
      const sectionKey = getSectionKey(sectionId)
      if (!sectionKey) return defaultValue
      const field = getFieldConfig(sectionKey, fieldName)
      if (!field) return defaultValue
      if (typeof field.required === 'boolean') return field.required
      return defaultValue
    },
    [getSectionKey, getFieldConfig]
  )

  // Helper to get field type from CMS schema
  const getFieldTypeById = useCallback(
    (sectionId, fieldName, defaultValue = 'text') => {
      const sectionKey = getSectionKey(sectionId)
      if (!sectionKey) {
        console.log('🔍 getFieldTypeById: No sectionKey for', { sectionId, fieldName, defaultValue })
        return defaultValue
      }
      const field = getFieldConfig(sectionKey, fieldName)
      const fieldType = field?.type || defaultValue
      console.log('🔍 getFieldTypeById:', { sectionId, fieldName, sectionKey, fieldExists: !!field, fieldType, defaultValue })
      // Normalize the type - handle case variations from schema
      const normalized = String(fieldType).toLowerCase().trim()
      // Map common variations to standard types
      let result = normalized || defaultValue
      if (normalized === 'text' || normalized === 'string') result = 'text'
      if (normalized === 'number' || normalized === 'numeric') result = 'number'
      if (normalized === 'alphanumeric' || normalized === 'alphanum') result = 'alphanumeric'
      console.log('🔍 getFieldTypeById result:', { fieldName, fieldType, normalized, result })
      return result
    },
    [getSectionKey, getFieldConfig]
  )

  // Action menu (three dots) state; position for portal so dropdown isn't clipped by table overflow
  const [openActionMenuId, setOpenActionMenuId] = useState(null)
  const [actionMenuPosition, setActionMenuPosition] = useState(null)

  // Detail view: employee shown in read-only detail modal; edit opens form with this section expanded
  const [detailEmployee, setDetailEmployee] = useState(null)
  const [openEditWithSection, setOpenEditWithSection] = useState(null)

  useEffect(() => {
    if (!openActionMenuId) return
    const handleClickOutside = () => {
      setOpenActionMenuId(null)
      setActionMenuPosition(null)
    }
    // Defer so the same click that opened the menu doesn't close it
    const t = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openActionMenuId])

  const toggleActionMenu = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget
    const rect = target?.getBoundingClientRect?.()
    const dropdownWidth = 192
    const dropdownHeight = 200 // ~4 items so menu stays in viewport when row is at bottom
    const left = rect ? Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 8) : 0
    const spaceBelow = rect ? window.innerHeight - rect.bottom - 8 : 0
    const openUpward = spaceBelow < dropdownHeight && rect
    const top = rect
      ? (openUpward
          ? Math.max(8, rect.top - dropdownHeight - 4)
          : rect.bottom + 4)
      : 0
    setActionMenuPosition(rect ? { top, left, openUpward } : null)
    setOpenActionMenuId(prev => (prev === id ? null : id))
  }

  const [profileImageFile, setProfileImageFile] = useState(null) // File to upload (not base64)
  const [headerProfileImageError, setHeaderProfileImageError] = useState(false) // fallback to initials when img fails to load
  const [failedProfileImageIds, setFailedProfileImageIds] = useState(() => new Set()) // list row avatars that failed to load
  const [formData, setFormData] = useState({
    // Basic Information
    profileImage: '', // URL path from server or blob URL for preview
    profileImageOriginalName: '', // Original filename (display only)
    firstName: '',
    middleName: '',
    lastName: '',
    employeeName: '', // Auto-generated
    email: '', // Personal Email
    alternativeEmail: '',
    officialEmail: '',
    phone: '',
    primaryCountryCode: '+91',
    secondaryCountryCode: '+91',
    employeeId: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    bloodGroup: '',
    emergencyContact: '',
    emergencyCountryCode: '+91',
    presentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
    permanentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
    aadhaarAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
    sameAsPresent: false, // UI state for checkbox
    aadhaarAddressOption: '', // 'present', 'permanent' or empty for manual
    emergencyContactName: '',
    emergencyContactNumber: '',
    isPhysicallyChallenged: false,
    physicallyChallengedDetails: '',
    isInternationalEmployee: false,
    countryOfOrigin: '',
    cityLocation: '',
    mobileNumber: '',
    familyDetails: [],

    // Employment Information
    department: '',
    designation: '',
    role: 'employee',
    employeeStatus: 'Active',
    joiningDate: '',
    cid: '',
    managerId: '',
    superManagerId: '',
    probationPeriod: '',
    confirmDate: '',
    noticePeriod: '',
    division: '',
    costCenter: '',
    grade: '',
    location: '',
    employeeNumberSeries: '',
    assignedProjects: [],

    // Professional Information
    education: [],
    languages: [],
    experience: '',
    salary: '',

    // Bank Details
    accountNumber: '',
    confirmAccountNumber: '',
    bankName: '',
    ifscCode: '',
    accountType: '',
    branchName: '',
    bankBranch: '',
    salaryPaymentMode: '',
    nameAsPerBankRecords: '',
    iban: '',
    swiftCode: '',

    // Documents
    // Documents
    documents: [],

    // PF Details
    isEligibleForPF: false,
    pfNumber: '',
    pfScheme: '',
    pfJoiningDate: '',
    eligibleForExcessEPFContribution: false,
    isEligibleForExcessEPSContribution: false,
    isExistingMemberOfPF: false,

    // ESI Details
    isEligibleForESI: false,
    esiNumber: '',
    isCoveredUnderLWF: false,

    // Account Setup
    password: ''
  })
  const [submittingSection, setSubmittingSection] = useState(null)


  // Accordion State
  const [expandedSections, setExpandedSections] = useState([1]) // First section open by default
  // Which section is in edit mode; others show read-only until Edit is clicked
  const [editingSectionId, setEditingSectionId] = useState(null)

  const toggleSection = (id) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSectionEditClick = (sectionId) => {
    setEditingSectionId(sectionId)
    setExpandedSections(prev => [...new Set([...prev, sectionId])])
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
      return
    }
    if (user && user.role !== 'admin') {
      navigate('/')
    }
  }, [navigate, user, loading])

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    if (!token) return

    try {
      setLoadingEmployees(true)
      const res = await axiosInstance.get('/api/auth/users')
      const data = res.data

      const nonAdminUsers = (data.users || []).filter(u => u.role !== 'admin')
      setEmployees(nonAdminUsers)
      setFailedProfileImageIds(new Set())
    } catch (error) {
      console.error('Error fetching employees:', error)
      // Global toast handles 5xx/network. 
      // We can toast for other errors if needed, or rely on global.
    } finally {
      setLoadingEmployees(false)
    }
  }, [token])



  useEffect(() => {
    if (user && user.role === 'admin' && token && !showForm) {
      fetchEmployees()
    }
  }, [user, token, showForm, fetchEmployees])

  // Whenever the multi-step form is opened (Add/Edit), reset progress
  // and scroll the main content container to the top.
  useEffect(() => {
    if (!showForm) return

    setExpandedSections([1])
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [showForm])

  // When opening edit from detail view with a specific section, expand that section
  useEffect(() => {
    if (showForm && openEditWithSection) {
      setExpandedSections(prev => [...new Set([openEditWithSection, ...prev])])
      setOpenEditWithSection(null)
    }
  }, [showForm, openEditWithSection])



  // Auto-generate Employee Name
  useEffect(() => {
    const { firstName, middleName, lastName } = formData
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ')
    if (formData.employeeName !== fullName) {
      setFormData(prev => ({ ...prev, employeeName: fullName }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.firstName, formData.middleName, formData.lastName, formData.employeeName])

  const editingEmployeeId = editingEmployee?.id ?? (typeof editingEmployee === 'string' ? editingEmployee : undefined)
  // Reset header profile image error when switching employee or when profile image changes
  useEffect(() => {
    setHeaderProfileImageError(false)
  }, [editingEmployeeId, formData.profileImage])

  // Auto-calculate confirmation date from joining date + probation period
  useEffect(() => {
    if (formData.joiningDate && formData.probationPeriod) {
      const joinDate = new Date(formData.joiningDate)
      const probDays = parseInt(formData.probationPeriod) || 0
      if (!isNaN(joinDate.getTime()) && probDays > 0) {
        const confirmDate = new Date(joinDate)
        confirmDate.setDate(joinDate.getDate() + probDays)
        const confirmDateStr = confirmDate.toISOString().slice(0, 10)
        // Only auto-set if confirmDate is empty or matches the calculated value (don't override manual edits)
        if (!formData.confirmDate || formData.confirmDate === confirmDateStr) {
          setFormData(prev => ({ ...prev, confirmDate: confirmDateStr }))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.joiningDate, formData.probationPeriod])

  // Family Details Handlers
  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyDetails: [...prev.familyDetails, { name: '', relation: '', dob: '' }]
    }))
  }

  const removeFamilyMember = (index) => {
    setFormData(prev => ({
      ...prev,
      familyDetails: prev.familyDetails.filter((_, i) => i !== index)
    }))
  }

  const handleFamilyDetailChange = (index, field, value) => {
    setFormData(prev => {
      const newDetails = [...prev.familyDetails]
      newDetails[index] = { ...newDetails[index], [field]: value }
      return { ...prev, familyDetails: newDetails }
    })
  }

  // const validateSection = (sectionId, data) => { // Removed unused
  //   // Helper to check if value exists
  //   const hasValue = (val) => val !== undefined && val !== null && String(val).trim() !== ''
  //
  //   switch (sectionId) {
  //     case 1: // Basic Information
  //       return (
  //         hasValue(data.firstName) &&
  //         hasValue(data.lastName) &&
  //         hasValue(data.gender) &&
  //         hasValue(data.email) &&
  //         hasValue(data.phone) &&
  //         hasValue(data.presentAddress) &&
  //         hasValue(data.emergencyContact) &&
  //         hasValue(data.employeeId)
  //       )
  //     case 2: // Employment Information
  //       // Role and Status typically have defaults, but good to check if they are "select" fields
  //       return hasValue(data.role) && hasValue(data.employeeStatus)
  //     case 9: // Account Setup
  //       // Password required only for new employees
  //       if (!editingEmployee) {
  //         return hasValue(data.password)
  //       }
  //       return true
  //     default:
  //       // Other sections have no strict mandatory fields in the current requirement
  //       return true
  //   }
  // }


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target || {}

    if (!name) {
      console.error('handleChange: name is undefined', e)
      return
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  // Render any extra fields from schema that are not in the known (hard-coded) list – makes every section fully dynamic
  // If arrayIndex and arrayName are provided, render fields inside array entries (e.g., education[0].fieldName)
  const renderSchemaExtraFields = (sectionId, knownFields, arrayIndex = null, arrayName = null) => {
    const sectionKey = getSectionKey(sectionId)
    if (!sectionKey) return null
    const section = getSectionConfig(sectionKey)
    const extra = section?.fields?.filter(
      (f) => !knownFields.includes(f.name) && f.isActive !== false
    ) || []

    return extra.map((field) => {
      if (!isFieldVisibleById(sectionId, field.name)) return null
      
      // Construct field name: if inside array entry, use arrayName[index].fieldName format
      const fieldName = arrayIndex !== null && arrayName ? `${arrayName}.${arrayIndex}.${field.name}` : field.name
      
      // Custom handleChange for array entries
      const customHandleChange = arrayIndex !== null && arrayName ? (e) => {
        const { name, value, type, checked } = e.target || {}
        const fieldNameOnly = name.split('.').pop() // Get just the field name without array path
        const newArray = [...formData[arrayName]]
        if (newArray[arrayIndex]) {
          newArray[arrayIndex] = {
            ...newArray[arrayIndex],
            [fieldNameOnly]: type === 'checkbox' ? checked : value
          }
          setFormData({ ...formData, [arrayName]: newArray })
        }
      } : handleChange
      
      return (
        <FormField
          key={fieldName}
          label={getFieldLabelById(sectionId, field.name, field.label || field.name)}
          name={fieldName}
          type={field.type || 'text'}
          required={field.required || false}
          formData={formData}
          handleChange={customHandleChange}
          placeholder={field.placeholder}
          options={field.options || []}
        />
      )
    })
  }

  // Address Copy Helpers
  const handleSameAsPresentChange = (e) => {
    const checked = e.target.checked
    setFormData(prev => ({
      ...prev,
      sameAsPresent: checked,
      permanentAddress: checked ? { ...prev.presentAddress } : prev.permanentAddress
    }))
  }

  const handleAadhaarAddressOptionChange = (e) => {
    const clicked = e.target.value
    setFormData(prev => {
      // Allow toggling off: clicking the same option again clears the selection
      const option = prev.aadhaarAddressOption === clicked ? '' : clicked

      let newAddr = prev.aadhaarAddress
      if (option === 'present') newAddr = { ...prev.presentAddress }
      if (option === 'permanent') newAddr = { ...prev.permanentAddress }
      // When option is '', keep whatever is currently in aadhaarAddress so user can edit manually
      return {
        ...prev,
        aadhaarAddressOption: option,
        aadhaarAddress: newAddr
      }
    })
  }

  // Load employee data into form for editing
  const handleEdit = async (employeeId) => {
    try {
      const res = await axiosInstance.get(`/api/auth/users/${employeeId}`)
      const data = res.data

      const emp = data.user
      // Format dates for input fields (YYYY-MM-DD)
      const formatDate = (date) => {
        if (!date) return ''
        const d = new Date(date)
        if (isNaN(d.getTime())) return ''
        return d.toISOString().split('T')[0]
      }

      // Populate form with employee data
      setFormData({
        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        profileImage: emp.profileImage || '',
        profileImageOriginalName: emp.profileImageOriginalName || '',
        firstName: emp.firstName || '',
        middleName: emp.middleName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        alternativeEmail: emp.alternativeEmail || '',
        officialEmail: emp.officialEmail || '',
        phone: emp.phone || '',
        primaryCountryCode: emp.primaryCountryCode || '+91',
        secondaryCountryCode: emp.secondaryCountryCode || '+91',
        employeeId: emp.employeeId || '',
        dateOfBirth: formatDate(emp.dateOfBirth),
        gender: emp.gender || '',
        maritalStatus: emp.maritalStatus || '',
        bloodGroup: emp.bloodGroup || '',
        emergencyContact: emp.emergencyContact || '',
        emergencyCountryCode: emp.emergencyCountryCode || '+91',
        presentAddress: emp.presentAddress || { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
        permanentAddress: emp.permanentAddress || { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
        aadhaarAddress: emp.aadhaarAddress || { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
        nickName: emp.nickName || '',
        employeeRefNumber: emp.employeeRefNumber || '',
        birthdayDate: formatDate(emp.birthdayDate),
        marriageDate: formatDate(emp.marriageDate),
        fathersName: emp.fathersName || '',
        familyDetails: emp.familyDetails || [],
        secondaryContact: emp.secondaryContact || '',
        officeEmail: emp.officeEmail || '',
        spouseName: emp.spouseName || '',
        loginUsername: emp.loginUsername || emp.username || '',
        ipAddress: emp.ipAddress || '',
        // permanentAddress handled above
        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactNumber: emp.emergencyContactNumber || '',
        isPhysicallyChallenged: emp.isPhysicallyChallenged || false,
        physicallyChallengedDetails: emp.physicallyChallengedDetails || '',
        isInternationalEmployee: emp.isInternationalEmployee || false,
        countryOfOrigin: emp.countryOfOrigin || '',
        cityLocation: emp.cityLocation || '',
        mobileNumber: emp.mobileNumber || '',
        numberOfChildren: emp.numberOfChildren || 0,
        childrenDobs: Array.isArray(emp.childrenDobs) ? emp.childrenDobs.map(formatDate) : [],
        department: emp.department || '',
        designation: emp.designation || '',
        role: emp.role || 'employee',
        employeeStatus: emp.isActive === false ? 'Inactive' : 'Active', // Map isActive to employeeStatus
        joiningDate: formatDate(emp.joiningDate),
        cid: emp.cid || '',
        managerId: emp.managerId || '',
        businessUnitHR: emp.businessUnitHR || '',
        superManagerId: emp.superManagerId || '',
        probationPeriod: emp.probationPeriod || '',
        confirmDate: formatDate(emp.confirmDate),
        noticePeriod: emp.noticePeriod || '',
        division: emp.division || '',
        costCenter: emp.costCenter || '',
        grade: emp.grade || '',
        location: emp.location || '',
        employeeNumberSeries: emp.employeeNumberSeries || '',
        assignedProjects: emp.assignedProjects || [],
        education: Array.isArray(emp.education) ? emp.education.map(edu => ({
          ...edu,
          fromDate: formatDate(edu.fromDate),
          toDate: formatDate(edu.toDate),
          fileName: edu.fileName || '',
          fileUrl: edu.fileUrl || ''
        })) : [],
        languages: Array.isArray(emp.languages) ? emp.languages : [],
        experience: Array.isArray(emp.experience) ? emp.experience : [],
        salary: emp.salary || '',
        accountNumber: emp.accountNumber || '',
        confirmAccountNumber: emp.accountNumber || '',
        bankName: emp.bankName || '',
        ifscCode: emp.ifscCode || '',
        accountType: emp.accountType || '',
        branchName: emp.branchName || '',
        bankBranch: emp.bankBranch || '',
        salaryPaymentMode: emp.salaryPaymentMode || '',
        ddPayableAt: emp.ddPayableAt || '',
        nameAsPerBankRecords: emp.nameAsPerBankRecords || '',
        iban: emp.iban || '',
        swiftCode: emp.swiftCode || '',
        documents: Array.isArray(emp.documents) ? emp.documents : [],
        isEligibleForPF: emp.isEligibleForPF || false,
        pfNumber: emp.pfNumber || '',
        pfScheme: emp.pfScheme || '',
        pfJoiningDate: formatDate(emp.pfJoiningDate),
        eligibleForExcessEPFContribution: emp.eligibleForExcessEPFContribution || false,
        isEligibleForExcessEPSContribution: emp.isEligibleForExcessEPSContribution || false,
        isExistingMemberOfPF: emp.isExistingMemberOfPF || false,
        isEligibleForESI: emp.isEligibleForESI || false,
        esiNumber: emp.esiNumber || '',
        isCoveredUnderLWF: emp.isCoveredUnderLWF || false,
        password: '' // Don't pre-fill password
      })
      setProfileImageFile(null)
      setEditingEmployee(employeeId)
      setAddFlowJustSaved(false) // Opening existing employee = edit mode
      setShowForm(true)
    } catch (error) {
      console.error('Error loading employee:', error)
      toast.error('Failed to load employee data')
    }
  }

  // Handle delete with confirmation
  const handleDeleteClick = (employee) => {
    setDeleteConfirmation(employee)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation || !token) return

    setDeleting(true)
    try {
      await axiosInstance.delete(`/api/auth/users/${deleteConfirmation._id || deleteConfirmation.id}`)

      toast.success('Employee deleted successfully')
      setDeleteConfirmation(null)
      await fetchEmployees()
    } catch (error) {
      console.error('Delete error:', error)
      // Let global toast handle 5xx. For manual error handling:
      if (error.response && error.response.status < 500) {
        toast.error(error.response.data.message || 'Failed to delete employee')
      }
      setDeleteConfirmation(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null)
  }

  // Account Number Masking State
  const [isAccountNumberFocused, setIsAccountNumberFocused] = useState(false)

  const getMaskedAccountNumber = (number) => {
    if (!number) return ''
    if (number.length <= 3) return number
    const visibleDigits = 3
    const maskedLength = number.length - visibleDigits
    return '•'.repeat(maskedLength) + number.slice(-visibleDigits)
  }

  // Handle Excel file import
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload a valid Excel file (.xlsx, .xls) or CSV file')
      return
    }

    setImporting(true)
    setImportProgress({ total: 0, success: 0, failed: 0, errors: [] })

    try {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet)

          if (jsonData.length === 0) {
            toast.error('Excel file is empty')
            setImporting(false)
            return
          }

          // Map Excel columns to form fields
          const mapExcelRowToEmployee = (row) => {
            // Common column name mappings
            const mapping = {
              'First Name': 'firstName',
              'First Name *': 'firstName', // Handle asterisk
              'FirstName': 'firstName',
              'first_name': 'firstName',
              'Middle Name': 'middleName',
              'MiddleName': 'middleName',
              'middle_name': 'middleName',
              'Last Name': 'lastName',
              'Last Name *': 'lastName', // Handle asterisk
              'LastName': 'lastName',
              'last_name': 'lastName',
              'Email': 'email',
              'Email *': 'email', // Handle asterisk
              'email': 'email',
              'Official Email ID': 'officialEmail',
              'Official Email ID *': 'officialEmail',
              'Official Email': 'officialEmail',
              'OfficialEmail': 'officialEmail',
              'officialEmail': 'officialEmail',
              'officeEmail': 'officialEmail',
              'Office Mail ID': 'officialEmail',
              'Office Mail ID *': 'officialEmail',
              'Phone': 'phone',
              'Phone *': 'phone',
              'phone': 'phone',
              'Phone Number': 'phone',
              'PhoneNumber': 'phone',
              'phone_number': 'phone',
              'Employee ID': 'employeeId',
              'Employee ID *': 'employeeId', // Handle asterisk
              'EmployeeID': 'employeeId',
              'Employee Id': 'employeeId',
              'employee_id': 'employeeId',
              'Emp ID': 'employeeId',
              'Role': 'role',
              'role': 'role',
              'Department': 'department',
              'department': 'department',
              'Designation': 'designation',
              'designation': 'designation',
              'Password': 'password',
              'password': 'password',
              'Location': 'location',
              'location': 'location',
              'Location (City)': 'cityLocation',
              'Location (City) .': 'cityLocation', // Handle trailing space dot
              'Location (City).': 'cityLocation', // Handle immediate dot
              'City': 'cityLocation',
              'Spouse DOB': 'spouseDob',
              'Number of Children': 'numberOfChildren',
              'Number of Children *': 'numberOfChildren',
              'Children DOBs': 'childrenDobs',
              'DOB as per Aadhaar': 'birthdayDate',
              'Employee Status': 'employeeStatus',
              'Nick Name': 'nickName',
              'Secondary Contact': 'secondaryContact',
              'Secondary Contact *': 'secondaryContact',
              'Employee Ref Number': 'employeeRefNumber',
              'Date of Birth': 'dateOfBirth',
              'Gender': 'gender',
              'Gender *': 'gender',
              'Marital Status': 'maritalStatus',
              'Marital Status *': 'maritalStatus',
              'Marriage Date': 'marriageDate',
              'Blood Group': 'bloodGroup',
              'Is Physically Challenged': 'isPhysicallyChallenged',
              'Is International Employee': 'isInternationalEmployee',
              'Is International Employee *': 'isInternationalEmployee', // Handle asterisk
              'Country of Origin': 'countryOfOrigin',
              'Emergency Contact': 'emergencyContact',
              'Emergency Contact Name': 'emergencyContactName',
              'Present Address': 'presentAddress',
              'Permanent Address': 'permanentAddress',
              'Father\'s Name': 'fathersName',
              'Spouse Name': 'spouseName',
              'IP Address': 'ipAddress',
              'Joining Date': 'joiningDate',
              'CID': 'cid',
              'Manager ID': 'managerId',
              'Super Manager ID': 'superManagerId',
              'Super Manager ID *': 'superManagerId', // Handle asterisk
              'Probation Period': 'probationPeriod',
              'Notice Period': 'noticePeriod',
              'Division': 'division',
              'Cost Center': 'costCenter',
              'Grade': 'grade',

              // Professional
              'Education': 'education',
              'Experience': 'experience',
              'Skills': 'skills',
              'Salary': 'salary',

              // Bank Details
              'Account Number': 'accountNumber',
              'Bank Name': 'bankName',
              'IFSC Code': 'ifscCode',
              'Account Type': 'accountType',
              'Branch Name': 'branchName',
              'Bank Branch': 'bankBranch',
              'Salary Payment Mode': 'salaryPaymentMode',
              'DD Payable At': 'ddPayableAt',
              'Name as per Bank Records': 'nameAsPerBankRecords',
              'IBAN': 'iban',

              // Documents
              'Aadhar Number': 'aadharNumber',
              'PAN Number': 'panNumber',
              'Passport Number': 'passportNumber',
              'Driving License': 'drivingLicense',
              'Aadhaar Card Enrolment No': 'aadhaarCardEnrolmentNo',
              'Name (As on Aadhaar Card)': 'nameAsOnAadhaarCard',
              'Name as on Aadhaar Card': 'nameAsOnAadhaarCard',
              'Universal Account Number': 'universalAccountNumber',

              // Background Verification
              'Background Verification Status': 'verificationStatus',
              'Verification Status': 'verificationStatus',
              'Verification Indication': 'verificationIndication',
              'Completed On': 'completedOn',
              'Agency Name': 'agencyName',
              'Remarks': 'remarks',

              // PF Details
              'Is Employee Eligible for PF': 'isEligibleForPF',
              'PF Number': 'pfNumber',
              'PF Scheme': 'pfScheme',
              'PF Joining Date': 'pfJoiningDate',
              'Eligible for Excess EPF Contribution': 'eligibleForExcessEPFContribution',
              'Is Employee Eligible for Excess EPS Contribution': 'isEligibleForExcessEPSContribution',
              'Is Existing Member of PF': 'isExistingMemberOfPF',

              // ESI Details
              'Is Employee Eligible for ESI': 'isEligibleForESI',
              'ESI Number': 'esiNumber',
              'Is Covered Under LWF': 'isCoveredUnderLWF'
            }

            const employee = {}

            // Map each column
            Object.keys(row).forEach(key => {
              const normalizedKey = key.trim()
              const fieldName = mapping[normalizedKey] || normalizedKey.toLowerCase().replace(/\s+/g, '')

              // Only include if it's a valid field
              if (fieldName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
                employee[fieldName] = row[key]
              }
            })

            // Handle special fields
            if (employee.childrenDobs && typeof employee.childrenDobs === 'string') {
              // Split by comma and trim
              employee.childrenDobs = employee.childrenDobs.split(',').map(d => d.trim())
            }

            // Handle Professional Info - Legacy Support for Excel Import
            if (employee.skills && typeof employee.skills === 'string') {
              employee.skills = employee.skills.split(',').map(s => s.trim())
            } else if (!Array.isArray(employee.skills)) {
              employee.skills = []
            }

            if (employee.education && typeof employee.education === 'string') {
              // Best effort: just put the whole string in 'institute'
              employee.education = [{ institute: employee.education, fromDate: null, toDate: null }]
            } else if (!Array.isArray(employee.education)) {
              employee.education = []
            }

            if (employee.experience && typeof employee.experience === 'string') {
              // Best effort: just put the whole string in 'organization'
              employee.experience = [{ organization: employee.experience, fromDate: null, toDate: null }]
            } else if (!Array.isArray(employee.experience)) {
              employee.experience = []
            }

            // Convert Boolean fields (Yes/No or true/false)
            const booleanFields = [
              'isPhysicallyChallenged', 'isInternationalEmployee',
              'isEligibleForPF', 'eligibleForExcessEPFContribution',
              'isEligibleForExcessEPSContribution', 'isExistingMemberOfPF',
              'isEligibleForESI', 'isCoveredUnderLWF'
            ]

            booleanFields.forEach(field => {
              if (employee[field]) {
                const val = String(employee[field]).toLowerCase().trim()
                employee[field] = (val === 'yes' || val === 'true')
              }
            })

            // Convert Number fields
            const numberFields = ['numberOfChildren', 'salary', 'probationPeriod', 'noticePeriod']
            numberFields.forEach(field => {
              if (employee[field] !== undefined && employee[field] !== null && employee[field] !== '') {
                const num = Number(employee[field])
                if (!isNaN(num)) {
                  employee[field] = num
                }
              }
            })

            // Map email to officialEmail if officialEmail is not provided
            // This allows using "Email" column for officialEmail
            if (!employee.officialEmail && employee.email) {
              employee.officialEmail = employee.email
            }
            
            // Ensure required fields
            if (!employee.firstName) employee.firstName = ''
            if (!employee.phone) employee.phone = ''
            if (!employee.employeeId) employee.employeeId = ''
            if (!employee.officialEmail) employee.officialEmail = ''
            if (!employee.role) employee.role = 'employee'
            if (!employee.password) {
              // Generate default password if not provided
              employee.password = `Temp${employee.employeeId || 'Pass'}123!`
            }

            return employee
          }

          // Process all rows
          const employees = jsonData.map(mapExcelRowToEmployee)

          setImportProgress(prev => ({ ...prev, total: employees.length }))

          // Import employees one by one
          let successCount = 0
          let failedCount = 0
          const errors = []

          for (let i = 0; i < employees.length; i++) {
            const emp = employees[i]

            // Validate required fields (backend requires: firstName, phone, employeeId, officialEmail, role)
            if (!emp.firstName || !emp.phone || !emp.employeeId || !emp.officialEmail || !emp.role) {
              const missingFields = []
              if (!emp.firstName) missingFields.push('FirstName')
              if (!emp.phone) missingFields.push('Phone')
              if (!emp.employeeId) missingFields.push('EmployeeID')
              if (!emp.officialEmail) missingFields.push('Official Email ID')
              if (!emp.role) missingFields.push('Role')
              failedCount++
              errors.push(`Row ${i + 2}: Missing required fields (${missingFields.join(', ')})`)
              continue
            }

            try {
              const apiData = {
                username: emp.loginUsername || emp.employeeId,
                email: emp.email || emp.officialEmail, // Use email if provided, otherwise use officialEmail
                officialEmail: emp.officialEmail,
                password: emp.password,
                fullName: `${emp.firstName} ${emp.lastName || ''}`.trim(),
                role: emp.role || 'employee',
                ...emp
              }

              // Use axiosInstance.post - it throws on error
              await axiosInstance.post('/api/auth/users', apiData)
              successCount++

            } catch (error) {
              failedCount++
              const msg = error.response?.data?.message || 'Failed to create'
              errors.push(`Row ${i + 2}: ${msg}`)
            }

            // Update progress
            setImportProgress({
              total: employees.length,
              success: successCount,
              failed: failedCount,
              errors: [...errors]
            })
          }

          // Show results
          if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} employee(s)`)
            await fetchEmployees()
          }

          if (failedCount > 0) {
            toast.error(`Failed to import ${failedCount} employee(s). ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}`)
          }

          // Close modal after a delay if all successful
          if (failedCount === 0) {
            setTimeout(() => {
              setShowImportModal(false)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }, 2000)
          }
        } catch (err) {
          toast.error('Error parsing Excel file: ' + err.message)
        } finally {
          setImporting(false)
        }
      }

      reader.onerror = () => {
        toast.error('Error reading file')
        setImporting(false)
      }

      reader.readAsArrayBuffer(file)
    } catch (err) {
      toast.error('Error processing file: ' + err.message)
      setImporting(false)
    }
  }

  // Helper to format employee for export
  const formatEmployeeForExport = (emp) => {
    // Clone and remove sensitive/internal fields
    const { _id, id: _unusedId, __v, password: _unusedPassword, profileImage: _unusedProfileImage, ...rest } = emp

    // Flatten or format specific fields if needed
    return {
      ...rest,
      dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : '',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '',
    }
  }

  const handleExportAll = () => {
    if (employees.length === 0) {
      toast.error('No employees to export')
      return
    }

    try {
      const dataToExport = employees.map(formatEmployeeForExport)
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Employees")
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `All_Employees_${dateStr}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Export successful')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export data')
    }
  }

  const handleExportSingle = (emp) => {
    try {
      const dataToExport = [formatEmployeeForExport(emp)]
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Employee Details")
      const name = (emp.firstName || 'Employee').replace(/[^a-z0-9]/gi, '_')
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `Employee_${name}_${dateStr}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Export successful')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export data')
    }
  }

  // Generate profile avatar with initials
  const getInitials = (emp) => {
    const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || 'U'
    const parts = name.split(' ').filter(p => p)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Generate avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const resetForm = () => {
    setProfileImageFile(null)
    setFormData({
      profileImage: '',
      profileImageOriginalName: '',
      employeeName: '',
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      primaryCountryCode: '+91',
      secondaryCountryCode: '+91',
      employeeId: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      bloodGroup: '',
      emergencyContact: '',
      presentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
      permanentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
      aadhaarAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
      sameAsPresent: false,
      aadhaarAddressOption: '',
      nickName: '',
      employeeRefNumber: '',
      birthdayDate: '',
      marriageDate: '',
      fathersName: '',
      spouseName: '',
      spouseDob: '',
      loginUsername: '',
      ipAddress: '',
      // permanentAddress handled above
      emergencyContactName: '',
      emergencyContactNumber: '',
      isPhysicallyChallenged: false,
      physicallyChallengedDetails: '',
      isInternationalEmployee: false,
      countryOfOrigin: '',
      cityLocation: '',
      mobileNumber: '',
      numberOfChildren: 0,
      childrenDobs: [],
      familyDetails: [],
      department: '',
      designation: '',
      role: 'employee',
      employeeStatus: 'Active',
      joiningDate: '',
      cid: '',
      managerId: '',
      superManagerId: '',
      probationPeriod: '',
      confirmDate: '',
      noticePeriod: '',
      division: '',
      costCenter: '',
      grade: '',
      location: '',
      employeeNumberSeries: '',
      education: [],
      languages: [],
      experience: [],
      salary: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      accountType: '',
      branchName: '',
      bankBranch: '',
      salaryPaymentMode: '',
      ddPayableAt: '',
      nameAsPerBankRecords: '',
      iban: '',
      aadharNumber: '',
      panNumber: '',
      passportNumber: '',
      drivingLicense: '',
      aadhaarCardEnrolmentNo: '',
      nameAsOnAadhaarCard: '',
      universalAccountNumber: '',
      verificationStatus: '',
      verificationIndication: '',
      completedOn: '',
      agencyName: '',
      remarks: '',
      isEligibleForPF: false,
      pfNumber: '',
      pfScheme: '',
      pfJoiningDate: '',
      eligibleForExcessEPFContribution: false,
      isEligibleForExcessEPSContribution: false,
      isExistingMemberOfPF: false,
      isEligibleForESI: false,
      esiNumber: '',
      isCoveredUnderLWF: false,
      password: ''
    })
    setEditingEmployee(null)
    setAddFlowJustSaved(false)
  }

  const handleSubmit = async (e, sectionId = null) => {
    if (e) e.preventDefault()
    if (!token) {
      toast.error('Not authenticated')
      return
    }

    // When saving a specific section, allow partial save (no global required-field check)
    const isSectionSave = sectionId != null
    if (!isSectionSave) {
      // Full form submit: validate required fields for initial creation
      if (!editingEmployee) {
        const missingFields = []
        if (!formData.firstName) missingFields.push('First Name')
        if (!formData.lastName) missingFields.push('Last Name')
        if (!formData.email) missingFields.push('Email')
        if (!formData.phone) missingFields.push('Phone')
        if (!formData.employeeId) missingFields.push('Employee ID')
        if (missingFields.length > 0) {
          toast.error(`Initial creation requires: ${missingFields.join(', ')}`)
          return
        }
      } else {
        if (!formData.employeeId) {
          toast.error('Employee ID is required')
          return
        }
      }
    }



    // Enforce permanent password for Account Setup section (Section 8) if it's a new entry
    if (sectionId === 8 && isNewEntry && !formData.password) {
      toast.error('Please set a permanent password for the new account')
      return
    }

    // Account Number Validation
    if (sectionId === 4 && formData.accountNumber !== formData.confirmAccountNumber) {
      toast.error('Account Number and Confirm Account Number do not match')
      return
    }

    // Uniqueness validation for critical fields
    const uniqueFields = [
      { field: 'employeeId', label: 'Employee ID' },
      { field: 'phone', label: 'Primary Contact' },
      { field: 'secondaryContact', label: 'Alternative Number' },
      { field: 'email', label: 'Personal Email ID' },
      { field: 'alternativeEmail', label: 'Alternative Email ID' },
      { field: 'accountNumber', label: 'Bank Account Number' },
      { field: 'aadharNumber', label: 'Aadhaar Number' },
      { field: 'panNumber', label: 'PAN Card Number' },
      { field: 'passportNumber', label: 'Passport Number' },
      { field: 'drivingLicense', label: 'Driving License' },
      { field: 'voterId', label: 'Voter ID' },
      { field: 'pfNumber', label: 'PF Number' },
      { field: 'universalAccountNumber', label: 'UAN' },
      { field: 'esiNumber', label: 'ESI Number' }
    ]

    // Check uniqueness for fields that have values
    for (const { field, label } of uniqueFields) {
      const value = formData[field]
      if (value && String(value).trim()) {
        try {
          const res = await axiosInstance.post('/api/auth/users/check-uniqueness', {
            field,
            value: String(value).trim(),
            excludeUserId: editingEmployee || null
          })
          if (!res.data.isUnique) {
            toast.error(`${label} already exists. Please use a different ${label.toLowerCase()}.`)
            setSubmittingSection(null)
            return
          }
        } catch (error) {
          console.error(`Error checking uniqueness for ${field}:`, error)
          // Continue if check fails (don't block submission)
        }
      }
    }

    // Check uniqueness for schema-driven fields (check all formData keys that might be unique)
    // This handles dynamically added fields from schema configuration
    const schemaUniqueFieldPatterns = [
      /^(.*[Aa]dhaar|.*[Aa]adhar).*$/i,
      /^(.*[Pp][Aa][Nn]).*$/i,
      /^(.*[Pp]assport).*$/i,
      /^(.*[Dd]riving.*[Ll]icense).*$/i,
      /^(.*[Vv]oter).*$/i,
      /^(.*[Pp][Ff].*[Nn]umber|.*[Pp][Ff][Nn]o).*$/i,
      /^(.*[Uu][Aa][Nn]|.*[Uu]niversal.*[Aa]ccount).*$/i,
      /^(.*[Ee][Ss][Ii]).*$/i,
      /^(.*[Aa]ccount.*[Nn]umber).*$/i,
      /^(.*[Ee]mployee.*[Ii][Dd]).*$/i
    ]

    for (const [key, value] of Object.entries(formData)) {
      if (!value || !String(value).trim()) continue
      
      // Check if field name matches any unique pattern
      const matchesPattern = schemaUniqueFieldPatterns.some(pattern => pattern.test(key))
      if (matchesPattern) {
        try {
          const res = await axiosInstance.post('/api/auth/users/check-uniqueness', {
            field: key,
            value: String(value).trim(),
            excludeUserId: editingEmployee || null
          })
          if (!res.data.isUnique) {
            const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
            toast.error(`${fieldLabel} already exists. Please use a different value.`)
            setSubmittingSection(null)
            return
          }
        } catch (error) {
          console.error(`Error checking uniqueness for schema field ${key}:`, error)
          // Continue if check fails
        }
      }
    }

    // Education Details validation (Section 3): require at least one complete qualification
    if (sectionId === 3) {
      const education = formData.education || []
      const nonEmptyRows = education.filter(e =>
        e &&
        (e.institute || e.degree || e.percentage || e.fromDate || e.toDate || e.fileName)
      )

      if (nonEmptyRows.length === 0) {
        toast.error('Please add at least one qualification before saving Education Details.')
        return
      }

      const hasIncomplete = nonEmptyRows.some(e =>
        !String(e.institute || '').trim() ||
        !String(e.degree || '').trim() ||
        !String(e.percentage || '').trim() ||
        !e.fromDate ||
        !e.toDate
      )

      if (hasIncomplete) {
        toast.error('Please fill Institute, Degree, Percentage, From and To dates for each qualification.')
        return
      }
    }

    // Family Details validation (Section 13): require all fields before saving
    if (sectionId === 13) {
      const family = formData.familyDetails || []
      const hasIncomplete = family.some(m =>
        !m ||
        !String(m.name || '').trim() ||
        !String(m.relation || '').trim() ||
        !m.dob
      )
      if (hasIncomplete) {
        toast.error('Please fill Name, Relationship, and DOB for all family members before saving.')
        return
      }
    }

    // Documents validation (Section 5): attachment mandatory, no duplicate types
    if (sectionId === 5) {
      const documents = formData.documents || []
      const documentTypes = documents.map(d => d.documentType).filter(Boolean)
      const duplicates = documentTypes.filter((type, index) => documentTypes.indexOf(type) !== index && type !== 'Other')
      if (duplicates.length > 0) {
        toast.error(`Duplicate document types found: ${[...new Set(duplicates)].join(', ')}. Please remove duplicates.`)
        return
      }
      const missingAttachment = documents.some(d => d.documentType && !d.fileName)
      if (missingAttachment) {
        toast.error('Please upload the required document file for all selected document types.')
        return
      }
      // Validate Aadhaar format (12 digits)
      const invalidAadhaar = documents.find(d => d.documentType === 'Aadhar Card' && d.documentNumber && d.documentNumber.length !== 12)
      if (invalidAadhaar) {
        toast.error('Aadhaar Number must be exactly 12 digits.')
        return
      }
      // Validate PAN format (ABCDE1234F)
      const invalidPAN = documents.find(d => d.documentType === 'PAN Card' && d.documentNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(d.documentNumber))
      if (invalidPAN) {
        toast.error('PAN Number must be in format ABCDE1234F (5 alphabets + 4 digits + 1 alphabet).')
        return
      }
    }

    // Experience Details validation (Section 10): dates validation
    if (sectionId === 10) {
      const experience = formData.experience || []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (const exp of experience) {
        if (exp.fromDate) {
          const fromDate = new Date(exp.fromDate)
          fromDate.setHours(0, 0, 0, 0)
          if (fromDate > today) {
            toast.error('From Date must not be a future date.')
            return
          }
        }
        if (exp.toDate) {
          const toDate = new Date(exp.toDate)
          toDate.setHours(0, 0, 0, 0)
          if (toDate > today) {
            toast.error('To Date must not be a future date.')
            return
          }
        }
        if (exp.fromDate && exp.toDate) {
          const fromDate = new Date(exp.fromDate)
          const toDate = new Date(exp.toDate)
          if (fromDate > toDate) {
            toast.error('From Date must be earlier than To Date.')
            return
          }
        }
      }
    }

    // Joining Date validation: no future dates beyond 1 year
    if (sectionId === 2 && formData.joiningDate) {
      const joiningDate = new Date(formData.joiningDate)
      const today = new Date()
      const maxDate = new Date(today)
      maxDate.setFullYear(today.getFullYear() + 1)
      if (joiningDate > maxDate) {
        toast.error('Joining Date cannot be more than 1 year in the future.')
        return
      }
    }

    // Confirm Date validation: must be after joining date and within probation period
    if (sectionId === 2 && formData.confirmDate && formData.joiningDate && formData.probationPeriod) {
      const joiningDate = new Date(formData.joiningDate)
      const confirmDate = new Date(formData.confirmDate)
      const probDays = parseInt(formData.probationPeriod) || 0
      const expectedConfirmDate = new Date(joiningDate)
      expectedConfirmDate.setDate(joiningDate.getDate() + probDays)
      
      if (confirmDate < joiningDate) {
        toast.error('Confirmation Date must be after Joining Date.')
        return
      }
      // Allow some flexibility (±30 days) for confirmation date
      const minDate = new Date(expectedConfirmDate)
      minDate.setDate(minDate.getDate() - 30)
      const maxDate = new Date(expectedConfirmDate)
      maxDate.setDate(maxDate.getDate() + 30)
      
      if (confirmDate < minDate || confirmDate > maxDate) {
        toast.error(`Confirmation Date should be within probation completion timeline (around ${expectedConfirmDate.toLocaleDateString()}).`)
        return
      }
    }

    // Bank Name & IFSC matching validation
    if (sectionId === 4 && formData.bankName && formData.ifscCode) {
      const bankName = String(formData.bankName).toLowerCase()
      const ifscCode = String(formData.ifscCode).toUpperCase()
      const bankCodes = {
        'canara': 'CNRB', 'canara bank': 'CNRB',
        'icici': 'ICIC', 'icici bank': 'ICIC',
        'hdfc': 'HDFC', 'hdfc bank': 'HDFC',
        'sbi': 'SBIN', 'state bank': 'SBIN',
        'axis': 'UTIB', 'axis bank': 'UTIB',
        'pnb': 'PUNB', 'punjab national bank': 'PUNB',
        'bob': 'BARB', 'bank of baroda': 'BARB',
        'boi': 'BKID', 'bank of india': 'BKID',
        'union': 'UBIN', 'union bank': 'UBIN',
        'iob': 'IOBA', 'indian overseas bank': 'IOBA'
      }
      const expectedCode = Object.keys(bankCodes).find(key => bankName.includes(key))
      if (expectedCode && !ifscCode.startsWith(bankCodes[expectedCode])) {
        toast.error('Bank Name and IFSC Code do not match. Please enter valid details.')
        return
      }
    }

    setSubmittingSection(sectionId)

    try {
      const isSectionSave = sectionId != null
      // Prepare data for API (map to backend expected format). Never send profile image as base64/blob.
      const apiData = {
        username: formData.loginUsername || formData.employeeId,
        email: formData.email,
        officialEmail: formData.officialEmail,
        alternativeEmail: formData.alternativeEmail,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        role: formData.role,
        isActive: formData.employeeStatus === 'Active',
        ...formData
      }
      if (apiData.profileImage && (String(apiData.profileImage).startsWith('data:') || String(apiData.profileImage).startsWith('blob:'))) {
        delete apiData.profileImage
      }
      // Section save for new employee: send draft so backend allows saving with just this section's data
      if (!editingEmployee && isSectionSave) {
        apiData.draft = true
      }

      // Only include password if provided (for new employees or password change)
      if (formData.password) {
        apiData.password = formData.password
      } else if (!editingEmployee) {
        apiData.password = `Temp@${formData.phone ? formData.phone.slice(-4) : Date.now().toString().slice(-4)}`
      }

      // Upload profile image as file first when we have a selected file
      if (profileImageFile) {
        const form = new FormData()
        form.append('avatar', profileImageFile)
        if (editingEmployee) {
          const avatarRes = await axiosInstance.put(`/api/auth/users/${editingEmployee}/avatar`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          const profileImageUrl = avatarRes.data?.profileImage
          const profileImageOriginalName = avatarRes.data?.profileImageOriginalName
          if (profileImageUrl) {
            apiData.profileImage = profileImageUrl
            setFormData(prev => ({
              ...prev,
              profileImage: profileImageUrl,
              ...(profileImageOriginalName ? { profileImageOriginalName } : {})
            }))
          }
          setProfileImageFile(null)
        } else {
          // New user: create first, then upload avatar
          const res = await axiosInstance.post('/api/auth/users', apiData)
          const newEmployee = res.data.user
          const newId = newEmployee._id || newEmployee.id
          setEditingEmployee(newId)
          setAddFlowJustSaved(true)
          const avatarRes = await axiosInstance.put(`/api/auth/users/${newId}/avatar`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          const profileImageUrl = avatarRes.data?.profileImage
          const profileImageOriginalName = avatarRes.data?.profileImageOriginalName
          if (profileImageUrl) {
            setFormData(prev => ({
              ...prev,
              profileImage: profileImageUrl,
              ...(profileImageOriginalName ? { profileImageOriginalName } : {})
            }))
          }
          setProfileImageFile(null)
          toast.success(isSectionSave ? 'Section saved. Continue with other sections.' : 'Employee created successfully.')
          await fetchEmployees()
          setSubmittingSection(null)
          return
        }
      }

      if (editingEmployee) {
        await axiosInstance.put(`/api/auth/users/${editingEmployee}`, apiData)
        toast.success(isSectionSave ? 'Section saved successfully' : 'Employee updated successfully')
        setEditingSectionId(null)
      } else {
        const res = await axiosInstance.post('/api/auth/users', apiData)
        const newEmployee = res.data.user
        setEditingEmployee(newEmployee._id || newEmployee.id)
        setAddFlowJustSaved(true) // Keep "Add New Employee" title and editable sections until user leaves
        toast.success(isSectionSave ? 'Section saved. Continue with other sections.' : 'Employee created successfully.')
      }

      // Refresh employees list but KEEP form open for incremental saving
      await fetchEmployees()

    } catch (error) {
      console.error('Submit error:', error)
      if (error.response && error.response.status < 500) {
        toast.error(error.response.data.message || `Failed to ${editingEmployee ? 'update' : 'create'} employee`)
      }
      // 5xx handled globally
    } finally {
      setSubmittingSection(null)
    }
  }

  // Handle Probation Actions
  const handleProbationAction = async (action) => {
    if (!editingEmployee || !formData.joiningDate || !formData.probationPeriod) return

    // Calculate confirmation date (today)
    const confirmDate = new Date().toISOString().split('T')[0]

    try {
      if (action === 'accept') {
        const updatedData = { ...formData, confirmDate }
        setFormData(updatedData) // specific update to UI state
        // We can either auto-save or just set state. User requested "confirm the emp there itself".
        // Let's call the API to save immediately.
        await axiosInstance.put(`/api/auth/users/${editingEmployee}`, { ...updatedData, role: formData.role }) // role is required field
        toast.success(`Probation confirmed. Employee confirmed on ${confirmDate}.`)
        await fetchEmployees()
      } else if (action === 'reject') {
        // Reject implies failing probation -> Inactive or Terminated.
        // User said "reject the emp".
        if (window.confirm("Are you sure you want to reject this employee's probation? This will set their status to Inactive.")) {
          const updatedData = { ...formData, employeeStatus: 'Inactive' }
          setFormData(updatedData)
          await axiosInstance.put(`/api/auth/users/${editingEmployee}`, { ...updatedData, role: formData.role })
          toast.success("Probation rejected. Employee status set to Inactive.")
          await fetchEmployees()
        }
      }
    } catch (error) {
      console.error('Probation action failed:', error)
      toast.error('Failed to update probation status')
    }
  }


  // Filter employees based on search and filters
  const filteredEmployees = employees.filter(emp => {
    const fullName = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
    const matchesSearch = !searchQuery ||
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone || '').includes(searchQuery)

    const matchesRole = filterRole === 'all' || emp.role === filterRole
    const matchesDepartment = filterDepartment === 'all' || (emp.department || '').toLowerCase() === filterDepartment.toLowerCase()
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'probation' && !emp.confirmDate && emp.isActive !== false) ||
      (filterStatus === 'confirmed' && emp.confirmDate && emp.isActive !== false)

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus
  })

  // Get unique departments and roles for filters
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort()
  const uniqueRoles = [...new Set(employees.map(emp => emp.role).filter(Boolean))].sort()

  // Calculate total for display
  const totalEmployees = employees.length

  // Employee List View
  if (!showForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Redesigned Header Section */}
          <div className="mb-8 space-y-6">
            {/* Title & Top Actions Row */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Employee Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage employee accounts, roles, and access permissions.
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    Total: {totalEmployees}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-800 transition-all shadow-sm"
                >
                  <FiUpload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>

                <button
                  onClick={() => handleExportAll()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-800 transition-all shadow-sm"
                >
                  <FiDownload className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <button
                  onClick={() => {
                    resetForm()
                    setIsNewEntry(true) // Start new entry flow
                    setShowForm(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all active:scale-95"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>Add Employee</span>
                </button>
              </div>
            </div>

            {/* Unified Toolbar: Search & Filters */}
            <div className="bg-white dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3 transition-colors">
              {/* Search Field */}
              <div className="relative w-full lg:max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-0 sm:text-sm"
                />
              </div>

              {/* Divider (Desktop) */}
              <div className="hidden lg:block w-px h-8 bg-gray-200 dark:bg-gray-800 mx-2"></div>

              {/* Filters Row */}
              <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
                {/* Role Filter */}
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full sm:w-40 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  ))}
                </select>

                {/* Department Filter */}
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full sm:w-32 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="probation">Probation</option>
                  <option value="confirmed">Confirmed</option>
                </select>

                {/* Clear Filters (Conditional) */}
                {(filterRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterRole('all')
                      setFilterDepartment('all')
                      setFilterStatus('all')
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Clear All Filters"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Employees Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors">
            {loadingEmployees ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner className="h-10 w-10 text-indigo-500" />
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-4">No employees found.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add First Employee
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        S. No
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 transition-colors">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-600 font-medium text-lg mb-2">No employees found</p>
                            <p className="text-gray-500 text-sm">
                              {searchQuery || filterRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Get started by adding your first employee'}
                            </p>
                            {(!searchQuery && filterRole === 'all' && filterDepartment === 'all' && filterStatus === 'all') && (
                              <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Add First Employee
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : filteredEmployees.map((emp, index) => {
                      const fullName = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
                      const initials = getInitials(emp)
                      const avatarColor = getAvatarColor(fullName)

                      return (
                        <tr
                          key={emp._id || emp.id}
                          className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors duration-150"
                        >
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {index + 1}
                          </td>
                          <td
                            className="px-2 py-3 whitespace-nowrap cursor-pointer"
                            onClick={() => { handleEdit(emp._id || emp.id); setIsNewEntry(false) }}
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                              {emp.employeeId || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              {/* Profile Avatar */}
{(emp.profileImage && !failedProfileImageIds.has(emp.id ?? emp._id)) ? (
                                  <img
                                    src={getProfileImageUrl(emp.profileImage)}
                                    alt={fullName}
                                    className="w-10 h-10 rounded-full object-cover shadow-md border border-gray-200"
                                    onError={() => setFailedProfileImageIds(prev => new Set([...prev, emp.id ?? emp._id]))}
                                  />
                              ) : (
                                <div className={`${avatarColor} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0`}>
                                  {initials}
                                </div>
                              )}
                              {/* Name and Email */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {fullName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {emp.officialEmail || emp.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-400">
                              {emp.phone || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full shadow-sm ${emp.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' :
                              emp.role === 'manager' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                                emp.role === 'hr' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' :
                                  emp.role === 'c-suite' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                              }`}>
                              {emp.role || 'employee'}
                            </span>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${emp.isActive !== false
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                              {emp.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => toggleActionMenu(emp._id || emp.id, e)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors focus:outline-none"
                                title="Actions"
                              >
                                <FiMoreVertical className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions dropdown: fixed position sibling of table so it is not clipped */}
          {openActionMenuId != null && actionMenuPosition && (() => {
            const idStr = String(openActionMenuId)
            const emp = filteredEmployees.find(e => String(e._id || e.id) === idStr)
            if (!emp) return null
            const closeMenu = () => { setOpenActionMenuId(null); setActionMenuPosition(null) }
            return (
              <div
                className="fixed w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-[100] border border-gray-200 dark:border-gray-700 ring-1 ring-black ring-opacity-5"
                style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
                onClick={(e) => e.stopPropagation()}
              >
                {emp.isActive !== false && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleEdit(emp._id || emp.id); setIsNewEntry(false); closeMenu() }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FiEye className="w-4 h-4" />
                      <span>View</span>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleEdit(emp._id || emp.id); setIsNewEntry(false); closeMenu() }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FiEdit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleExportSingle(emp); closeMenu() }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FiDownload className="w-4 h-4" />
                    <span>Download</span>
                  </div>
                </button>
                {emp.isActive !== false && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(emp); closeMenu() }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FiTrash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </div>
                  </button>
                )}
              </div>
            )
          })()}

          {/* Employee Detail Modal - click row or View icon to open */}
          {detailEmployee && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetailEmployee(null)}>
              <div
                className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {detailEmployee.fullName || `${detailEmployee.firstName || ''} ${detailEmployee.lastName || ''}`.trim() || 'Employee Details'}
                  </h2>
                  <button onClick={() => setDetailEmployee(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 space-y-4">
                  {(() => {
                    const e = detailEmployee
                    const editSection = (sectionId) => {
                      setOpenEditWithSection(sectionId)
                      setDetailEmployee(null)
                      handleEdit(e._id || e.id)
                    }
                    const DetailBlock = ({ title, sectionId, children }) => (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                          <button
                            type="button"
                            onClick={() => editSection(sectionId)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                        <div className="p-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {children}
                        </div>
                      </div>
                    )
                    return (
                      <>
                        <DetailBlock title={getSectionTitleById(1, 'Basic Information')} sectionId={1}>
                          <p><span className="text-gray-500 dark:text-gray-400">Name:</span> {e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Gender:</span> {e.gender || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">DOB:</span> {e.dateOfBirth || e.birthdayDate || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Marital status:</span> {e.maritalStatus || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Blood group:</span> {e.bloodGroup || '—'}</p>
                        </DetailBlock>
                        <DetailBlock title={getSectionTitleById(12, 'Contact Information')} sectionId={12}>
                          <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {e.phone || e.mobileNumber || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Personal email:</span> {e.email || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Official email:</span> {e.officialEmail || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Emergency contact:</span> {e.emergencyContactName || '—'} {e.emergencyContactNumber ? `(${e.emergencyContactNumber})` : ''}</p>
                        </DetailBlock>
                        <DetailBlock title={getSectionTitleById(16, 'Communication / Address')} sectionId={16}>
                          <p><span className="text-gray-500 dark:text-gray-400">Present:</span> {[e.presentAddress?.line1, e.presentAddress?.line2, e.presentAddress?.district, e.presentAddress?.state, e.presentAddress?.pincode, e.presentAddress?.country].filter(Boolean).join(', ') || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Permanent:</span> {[e.permanentAddress?.line1, e.permanentAddress?.line2, e.permanentAddress?.district, e.permanentAddress?.state, e.permanentAddress?.pincode, e.permanentAddress?.country].filter(Boolean).join(', ') || '—'}</p>
                        </DetailBlock>
                        <DetailBlock title={getSectionTitleById(2, 'Employment Information')} sectionId={2}>
                          <p><span className="text-gray-500 dark:text-gray-400">Employee ID:</span> {e.employeeId || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Department:</span> {e.department || e.businessUnitHR || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Designation:</span> {e.designation || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Role:</span> {e.role || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Status:</span> {e.isActive !== false ? 'Active' : 'Inactive'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Joining date:</span> {e.joiningDate || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Confirm date:</span> {e.confirmDate || '—'}</p>
                        </DetailBlock>
                        <DetailBlock title={getSectionTitleById(13, 'Family Details')} sectionId={13}>
                          {(Array.isArray(e.familyDetails) && e.familyDetails.length > 0) ? e.familyDetails.map((f, i) => (
                            <p key={i}>{f.name || '—'} ({f.relation || '—'}) {f.dob ? ` · ${f.dob}` : ''}</p>
                          )) : <p>—</p>}
                        </DetailBlock>
                        <DetailBlock title={getSectionTitleById(4, 'Bank Details')} sectionId={4}>
                          <p><span className="text-gray-500 dark:text-gray-400">Bank:</span> {e.bankName || '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Account:</span> {e.accountNumber ? '••••' + (e.accountNumber.slice(-4)) : '—'}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">IFSC:</span> {e.ifscCode || '—'}</p>
                        </DetailBlock>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmation && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-transparent dark:border-gray-800 transition-colors">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Confirm Delete</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {deleteConfirmation.fullName || `${deleteConfirmation.firstName || ''} ${deleteConfirmation.lastName || ''}`.trim() || deleteConfirmation.email}
                    </span>
                    ? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleDeleteCancel}
                      disabled={deleting}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Excel Modal */}
          {showImportModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-transparent dark:border-gray-800 transition-colors">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Employees from Excel</h3>
                    <button
                      onClick={() => {
                        setShowImportModal(false)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        setImportProgress({ total: 0, success: 0, failed: 0, errors: [] })
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Upload an Excel file (.xlsx, .xls) or CSV file with employee data. Required columns: <strong>First Name, Email, Phone, Employee ID</strong>
                    </p>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        disabled={importing}
                        className="hidden"
                        id="excel-upload"
                      />
                      <label
                        htmlFor="excel-upload"
                        className={`cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FiUpload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">
                          {importing ? 'Importing...' : 'Click to upload Excel file'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports .xlsx, .xls, .csv files
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Import Progress */}
                  {importProgress.total > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress: {importProgress.success + importProgress.failed} / {importProgress.total}</span>
                        <span className="text-green-600">Success: {importProgress.success}</span>
                        <span className="text-red-600">Failed: {importProgress.failed}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((importProgress.success + importProgress.failed) / importProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Details */}
                  {importProgress.errors.length > 0 && (
                    <div className="mb-4 max-h-40 overflow-y-auto">
                      <p className="text-sm font-semibold text-red-600 mb-2">Errors:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {importProgress.errors.slice(0, 10).map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                        {importProgress.errors.length > 10 && (
                          <li className="text-gray-500">... and {importProgress.errors.length - 10} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Excel Template Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Expected Excel Format:</p>
                    <div className="text-xs text-blue-800 space-y-1">
                      <p><strong>Required columns:</strong> First Name, Official Email ID (or Email), Phone, Employee ID, Role</p>
                      <p><strong>Optional columns:</strong> Last Name, Middle Name, Department, Designation, Location, Password (defaults to Temp[EmployeeID]123! if not provided)</p>
                      <p className="mt-2 text-blue-700"><strong>Note:</strong> If "Official Email ID" column is not present, "Email" column will be used as Official Email ID.</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowImportModal(false)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        setImportProgress({ total: 0, success: 0, failed: 0, errors: [] })
                      }}
                      disabled={importing}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {importing ? 'Importing...' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Add Employee Form View — keep "add" UX (title + editable sections) until user leaves, even after first section save
  const isAddFlow = !editingEmployee || addFlowJustSaved
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Compact Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isAddFlow && (
              <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                {formData.profileImage && !headerProfileImageError ? (
                  <img
                    src={getProfileImageUrl(formData.profileImage)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setHeaderProfileImageError(true)}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-sm font-semibold text-white ${getAvatarColor(`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.employeeId || 'U')}`}>
                    {getInitials({ fullName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.employeeId || 'U' })}
                  </div>
                )}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isAddFlow ? 'Add New Employee' : 'Edit Employee'}
              </h1>
              {!isAddFlow && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Employee ID: <span className="font-medium text-gray-700 dark:text-gray-300">{formData.employeeId || '—'}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Back to List
            </button>
          </div>
        </div>


        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Basic Information (wired to CMS schema for title + key field labels) */}
            <FormSection
              title={getSectionTitleById(1, 'Basic Information')}
              sectionId={1}
              isOpen={expandedSections.includes(1)}
              onToggle={() => toggleSection(1)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 1}
              isEditMode={isAddFlow || editingSectionId === 1}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {/* Employee Name - Read Only Display */}
              {isFieldVisibleById(1, 'employeeName') && (
              <div className="col-span-full">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {getFieldLabelById(1, 'employeeName', 'Employee Name')} {getFieldRequiredById(1, 'employeeName', true) && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  name="employeeName"
                  value={formData.employeeName || ''}
                  readOnly
                  className="w-full px-3 py-2 text-base font-bold border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-default focus:outline-none"
                />
              </div>
              )}

              {/* Name Parts Inputs */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
                {isFieldVisible('basic-info', 'firstName') && (
                  <FormField
                    label={getFieldLabel('basic-info', 'firstName', 'First Name')}
                    name="firstName"
                    type={getFieldTypeById(1, 'firstName', 'text')}
                    required={getFieldRequiredById(1, 'firstName', true)}
                    formData={formData}
                    handleChange={handleChange}
                    placeholder={getFieldLabel('basic-info', 'firstName', 'First Name')}
                  />
                )}
                {isFieldVisible('basic-info', 'middleName') && (
                  <FormField
                    label={getFieldLabel('basic-info', 'middleName', 'Middle Name')}
                    name="middleName"
                    required={getFieldRequiredById(1, 'middleName', false)}
                    formData={formData}
                    handleChange={handleChange}
                    placeholder={getFieldLabel('basic-info', 'middleName', 'Middle Name')}
                  />
                )}
                {isFieldVisible('basic-info', 'lastName') && (
                  <FormField
                    label={getFieldLabel('basic-info', 'lastName', 'Last Name')}
                    name="lastName"
                    required={getFieldRequiredById(1, 'lastName', true)}
                    formData={formData}
                    handleChange={handleChange}
                    placeholder={getFieldLabel('basic-info', 'lastName', 'Last Name')}
                  />
                )}
              </div>

              {/* Row 2: Gender & Blood Group */}
              {isFieldVisibleById(1, 'gender') && (
                <FormField label={getFieldLabelById(1, 'gender', 'Gender')} name="gender" type="select" required={getFieldRequiredById(1, 'gender', false)} options={getFieldOptionsById(1, 'gender', genders)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(1, 'bloodGroup') && (
                <FormField label={getFieldLabelById(1, 'bloodGroup', 'Blood Group')} name="bloodGroup" type="select" options={getFieldOptionsById(1, 'bloodGroup', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])} formData={formData} handleChange={handleChange} />
              )}

              {/* Row 3: DOBs - both must be at least 18 years ago (no future, 18+ only) */}
              {isFieldVisibleById(1, 'birthdayDate') && (() => {
                const today = new Date()
                const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
                const maxDobStr = maxDob.toISOString().slice(0, 10)
                return (
                  <FormField
                    label={getFieldLabelById(1, 'birthdayDate', 'DOB as per Aadhaar')}
                    name="birthdayDate"
                    type="date"
                    formData={formData}
                    handleChange={handleChange}
                    min="1900-01-01"
                    max={maxDobStr}
                  />
                )
              })()}
              {isFieldVisibleById(1, 'dateOfBirth') && (() => {
                const today = new Date()
                const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
                const maxDobStr = maxDob.toISOString().slice(0, 10)
                return (
                  <FormField
                    label={getFieldLabelById(1, 'dateOfBirth', 'Date of Birth (Actual)')}
                    name="dateOfBirth"
                    type="date"
                    formData={formData}
                    handleChange={handleChange}
                    min="1900-01-01"
                    max={maxDobStr}
                  />
                )
              })()}

              {/* Row 4: Marital Status; Marriage Date only when not Single */}
              {isFieldVisibleById(1, 'maritalStatus') && (
                <FormField label={getFieldLabelById(1, 'maritalStatus', 'Marital Status')} name="maritalStatus" type="select" options={getFieldOptionsById(1, 'maritalStatus', maritalStatuses)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(1, 'marriageDate') && String(formData.maritalStatus || '').trim().toLowerCase() !== 'single' && (() => {
                const today = new Date()
                const todayStr = today.toISOString().slice(0, 10)
                return (
                  <FormField 
                    label={getFieldLabelById(1, 'marriageDate', 'Marriage Date')} 
                    name="marriageDate" 
                    type="date" 
                    formData={formData} 
                    handleChange={handleChange}
                    min="1900-01-01"
                    max={todayStr}
                  />
                )
              })()}

              {/* Physically Challenged - Conditional */}
              {isFieldVisibleById(1, 'isPhysicallyChallenged') && (
              <div className="col-span-full">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="isPhysicallyChallenged"
                    name="isPhysicallyChallenged"
                    checked={formData.isPhysicallyChallenged || false}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPhysicallyChallenged" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getFieldLabelById(1, 'isPhysicallyChallenged', 'Is Physically Challenged?')}
                  </label>
                </div>

                {formData.isPhysicallyChallenged && (
                  <div className="mt-2 animate-fadeIn">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Details (Please specify)
                    </label>
                    <textarea
                      name="physicallyChallengedDetails"
                      value={formData.physicallyChallengedDetails || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Provide details about the physical challenge..."
                    />
                  </div>
                )}
              </div>
              )}

              {/* Profile Image Upload (file upload, not base64) */}
              {isFieldVisibleById(1, 'profileImage') && (
              <div className="col-span-full mt-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {getFieldLabelById(1, 'profileImage', 'Profile Image (Max 1MB)')}
                </label>
                <div className="flex items-center gap-4">
                  {(formData.profileImage && !headerProfileImageError) ? (
                    <img
                      src={getProfileImageUrl(formData.profileImage)}
                      alt="Profile Preview"
                      className="w-16 h-16 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                      onError={() => setHeaderProfileImageError(true)}
                    />
                  ) : formData.profileImage ? (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold text-white border border-gray-300 dark:border-gray-600 ${getAvatarColor(`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.employeeId || 'U')}`}>
                      {getInitials({ fullName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.employeeId || 'U' })}
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (!['image/jpeg', 'image/png'].includes(file.type)) {
                        toast.error('Only JPEG and PNG images are allowed')
                        e.target.value = ''
                        return
                      }
                      const maxSize = 1024 * 1024 // 1MB
                      if (file.size > maxSize) {
                        toast.error('Image size must be less than 1MB')
                        e.target.value = ''
                        return
                      }
                      setFormData(prev => {
                        if (prev.profileImage && prev.profileImage.startsWith('blob:')) {
                          try { URL.revokeObjectURL(prev.profileImage) } catch { /* revokeObjectURL may throw */ }
                        }
                        return { ...prev, profileImage: URL.createObjectURL(file) }
                      })
                      setProfileImageFile(file)
                      toast.success('Image selected. Save section to upload.')
                    }}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
                  />
                </div>
                {formData.profileImage && (
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.profileImage && formData.profileImage.startsWith('blob:')) {
                        try { URL.revokeObjectURL(formData.profileImage) } catch { /* revokeObjectURL may throw */ }
                      }
                      setFormData(prev => ({ ...prev, profileImage: '' }))
                      setProfileImageFile(null)
                      toast.success('Image removed')
                    }}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-2 hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>
              )}
              {renderSchemaExtraFields(1, ['employeeName', 'firstName', 'middleName', 'lastName', 'gender', 'bloodGroup', 'birthdayDate', 'dateOfBirth', 'maritalStatus', 'marriageDate', 'isPhysicallyChallenged', 'physicallyChallengedDetails', 'profileImage', 'isInternationalEmployee', 'countryOfOrigin', 'cityLocation'])}
            </FormSection>

            {/* Contact Information (New Section) */}
            <FormSection
              title={getSectionTitleById(12, 'Contact Information')}
              sectionId={12}
              isOpen={expandedSections.includes(12)}
              onToggle={() => toggleSection(12)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 12}
              isEditMode={isAddFlow || editingSectionId === 12}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              <div className="col-span-full space-y-3">
                {/* Primary Contact */}
                {isFieldVisibleById(12, 'phone') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {getFieldLabelById(12, 'phone', 'Primary Contact')} {getFieldRequiredById(12, 'phone', true) && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-16">
                      <select
                        name="primaryCountryCode"
                        value={formData.primaryCountryCode || '+91'}
                        onChange={handleChange}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {countryCodes.map((country, index) => (
                          <option key={`${country.code}-${index}`} value={country.code}>
                            {country.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      maxLength={10}
                      required={getFieldRequiredById(12, 'phone', true)}
                      className="w-44 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder={getFieldLabelById(12, 'phone', 'Primary contact number')}
                    />
                  </div>
                </div>
                )}

                {/* Secondary Contact */}
                {isFieldVisibleById(12, 'secondaryContact') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {getFieldLabelById(12, 'secondaryContact', 'Secondary Contact')}
                  </label>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-16">
                      <select
                        name="secondaryCountryCode"
                        value={formData.secondaryCountryCode || '+91'}
                        onChange={handleChange}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {countryCodes.map((country, index) => (
                          <option key={`${country.code}-${index}`} value={country.code}>
                            {country.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="tel"
                      name="secondaryContact"
                      value={formData.secondaryContact || ''}
                      onChange={handleChange}
                      maxLength={10}
                      className="w-44 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder={getFieldLabelById(12, 'secondaryContact', 'Secondary contact number')}
                    />
                  </div>
                </div>
                )}

                {/* Emergency Contact */}
                {isFieldVisibleById(12, 'emergencyContactNumber') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {getFieldLabelById(12, 'emergencyContactNumber', 'Emergency Contact Number')} {getFieldRequiredById(12, 'emergencyContact', true) && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-16">
                      <select
                        name="emergencyCountryCode"
                        value={formData.emergencyCountryCode || '+91'}
                        onChange={handleChange}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {countryCodes.map((country, index) => (
                          <option key={`${country.code}-${index}`} value={country.code}>
                            {country.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="tel"
                      name="emergencyContact"
                      value={formData.emergencyContact || ''}
                      onChange={handleChange}
                      maxLength={10}
                      required={getFieldRequiredById(12, 'emergencyContact', true)}
                      className="w-44 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder={getFieldLabelById(12, 'emergencyContactNumber', 'Emergency contact number')}
                    />
                  </div>
                </div>
                )}
              </div>

              {isFieldVisibleById(12, 'emergencyContactName') && (
                <FormField label={getFieldLabelById(12, 'emergencyContactName', 'Emergency Contact Name')} name="emergencyContactName" required={getFieldRequiredById(12, 'emergencyContactName', false)} formData={formData} handleChange={handleChange} />
              )}

              {/* Emails */}
              {isFieldVisibleById(12, 'email') && (
                <FormField
                  label={getFieldLabelById(12, 'email', 'Personal Email ID')}
                  name="email"
                  type="email"
                  required={getFieldRequiredById(12, 'email', false)}
                  formData={formData}
                  handleChange={handleChange}
                />
              )}
              {isFieldVisibleById(12, 'alternativeEmail') && (
                <FormField
                  label={getFieldLabelById(12, 'alternativeEmail', 'Alternative Email ID')}
                  name="alternativeEmail"
                  type="email"
                  required={getFieldRequiredById(12, 'alternativeEmail', false)}
                  formData={formData}
                  handleChange={handleChange}
                />
              )}

              {renderSchemaExtraFields(12, ['phone', 'secondaryContact', 'emergencyContact', 'emergencyContactNumber', 'emergencyContactName', 'email', 'alternativeEmail', 'primaryCountryCode', 'secondaryCountryCode', 'emergencyCountryCode', 'mobileNumber'])}

            </FormSection>

            {/* Communication Details (Refined) */}
            <FormSection
              title={getSectionTitleById(16, 'Communication Details')}
              sectionId={16}
              isOpen={expandedSections.includes(16)}
              onToggle={() => toggleSection(16)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 16}
              isEditMode={isAddFlow || editingSectionId === 16}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {/* Present Address */}
              <div className="col-span-full mt-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-1">{getFieldLabelById(16, 'headingPresentAddress', 'Present Address')}</h4>
              </div>
              {isFieldVisibleById(16, 'presentAddress.line1') && (
                <div className="col-span-full">
                  <FormField label={getFieldLabelById(16, 'presentAddress.line1', 'Address Line 1')} name="presentAddress.line1" required={getFieldRequiredById(16, 'presentAddress.line1', false)} formData={formData} handleChange={handleChange} />
                </div>
              )}
              {isFieldVisibleById(16, 'presentAddress.line2') && (
                <div className="col-span-full">
                  <FormField label={getFieldLabelById(16, 'presentAddress.line2', 'Address Line 2')} name="presentAddress.line2" formData={formData} handleChange={handleChange} />
                </div>
              )}
              {isFieldVisibleById(16, 'presentAddress.district') && (
                <FormField label={getFieldLabelById(16, 'presentAddress.district', 'City')} name="presentAddress.district" required={getFieldRequiredById(16, 'presentAddress.district', false)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(16, 'presentAddress.state') && (
                <FormField label={getFieldLabelById(16, 'presentAddress.state', 'State/Province/Region')} name="presentAddress.state" required={getFieldRequiredById(16, 'presentAddress.state', false)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(16, 'presentAddress.pincode') && (
                <FormField label={getFieldLabelById(16, 'presentAddress.pincode', 'ZIP/Postal Code')} name="presentAddress.pincode" required={getFieldRequiredById(16, 'presentAddress.pincode', false)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(16, 'presentAddress.country') && (
                <FormField label={getFieldLabelById(16, 'presentAddress.country', 'Country')} name="presentAddress.country" required={getFieldRequiredById(16, 'presentAddress.country', false)} formData={formData} handleChange={handleChange} />
              )}

              {/* Permanent Address */}
              <div className="col-span-full mt-4 mb-2 flex flex-col md:flex-row md:items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getFieldLabelById(16, 'headingPermanentAddress', 'Permanent Address')}</h4>
                <div className="flex items-center mt-2 md:mt-0">
                  <input
                    type="checkbox"
                    id="sameAsPresent"
                    checked={formData.sameAsPresent}
                    onChange={handleSameAsPresentChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sameAsPresent" className="ml-2 text-xs text-gray-600 dark:text-gray-400">{getFieldLabelById(16, 'sameAsPresentAddress', 'Same as Present Address')}</label>
                </div>
              </div>
              {isFieldVisibleById(16, 'permanentAddress.line1') && (
                <div className="col-span-full">
                  <FormField label={getFieldLabelById(16, 'permanentAddress.line1', 'Address Line 1')} name="permanentAddress.line1" required={getFieldRequiredById(16, 'permanentAddress.line1', false)} formData={formData} handleChange={handleChange} />
                </div>
              )}
              {isFieldVisibleById(16, 'permanentAddress.line2') && (
                <div className="col-span-full">
                  <FormField label={getFieldLabelById(16, 'permanentAddress.line2', 'Address Line 2')} name="permanentAddress.line2" formData={formData} handleChange={handleChange} />
                </div>
              )}
              {isFieldVisibleById(16, 'permanentAddress.district') && (
                <FormField label={getFieldLabelById(16, 'permanentAddress.district', 'City')} name="permanentAddress.district" required={getFieldRequiredById(16, 'permanentAddress.district', false)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(16, 'permanentAddress.state') && (
                <FormField label={getFieldLabelById(16, 'permanentAddress.state', 'State/Province/Region')} name="permanentAddress.state" required={getFieldRequiredById(16, 'permanentAddress.state', false)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(16, 'permanentAddress.pincode') && (
                <FormField label={getFieldLabelById(16, 'permanentAddress.pincode', 'ZIP/Postal Code')} name="permanentAddress.pincode" required={getFieldRequiredById(16, 'permanentAddress.pincode', false)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(16, 'permanentAddress.country') && (
                <FormField label={getFieldLabelById(16, 'permanentAddress.country', 'Country')} name="permanentAddress.country" required={getFieldRequiredById(16, 'permanentAddress.country', false)} formData={formData} handleChange={handleChange} />
              )}

              {/* Address as per Aadhaar */}
              <div className="col-span-full mt-4 mb-2 flex flex-col md:flex-row md:items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getFieldLabelById(16, 'headingAadhaarAddress', 'Address as per Aadhaar')}</h4>
                <div className="flex flex-wrap gap-4 mt-2 md:mt-0 text-xs text-gray-600 dark:text-gray-400">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="aadhaarAddressOption" value="present" checked={formData.aadhaarAddressOption === 'present'} onChange={handleAadhaarAddressOptionChange} className="mr-1" />
                    {getFieldLabelById(16, 'aadhaarSameAsPresent', 'Same as Present')}
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="aadhaarAddressOption" value="permanent" checked={formData.aadhaarAddressOption === 'permanent'} onChange={handleAadhaarAddressOptionChange} className="mr-1" />
                    {getFieldLabelById(16, 'aadhaarSameAsPermanent', 'Same as Permanent')}
                  </label>
                </div>
              </div>
              {isFieldVisibleById(16, 'aadhaarAddress.line1') && (
                <div className="col-span-full">
                  <FormField
                    label={getFieldLabelById(16, 'aadhaarAddress.line1', 'Address Line 1')}
                    name="aadhaarAddress.line1"
                    required={getFieldRequiredById(16, 'aadhaarAddress.line1', false)}
                    formData={formData}
                    handleChange={handleChange}
                    disabled={formData.aadhaarAddressOption === 'present' || formData.aadhaarAddressOption === 'permanent'}
                  />
                </div>
              )}
              {isFieldVisibleById(16, 'aadhaarAddress.line2') && (
                <div className="col-span-full">
                  <FormField
                    label={getFieldLabelById(16, 'aadhaarAddress.line2', 'Address Line 2')}
                    name="aadhaarAddress.line2"
                    formData={formData}
                    handleChange={handleChange}
                    disabled={formData.aadhaarAddressOption === 'present' || formData.aadhaarAddressOption === 'permanent'}
                  />
                </div>
              )}
              {isFieldVisibleById(16, 'aadhaarAddress.district') && (
                <FormField
                  label={getFieldLabelById(16, 'aadhaarAddress.district', 'City')}
                  name="aadhaarAddress.district"
                  required={getFieldRequiredById(16, 'aadhaarAddress.district', false)}
                  formData={formData}
                  handleChange={handleChange}
                  disabled={formData.aadhaarAddressOption === 'present' || formData.aadhaarAddressOption === 'permanent'}
                />
              )}
              {isFieldVisibleById(16, 'aadhaarAddress.state') && (
                <FormField
                  label={getFieldLabelById(16, 'aadhaarAddress.state', 'State/Province/Region')}
                  name="aadhaarAddress.state"
                  required={getFieldRequiredById(16, 'aadhaarAddress.state', false)}
                  formData={formData}
                  handleChange={handleChange}
                  disabled={formData.aadhaarAddressOption === 'present' || formData.aadhaarAddressOption === 'permanent'}
                />
              )}
              {isFieldVisibleById(16, 'aadhaarAddress.pincode') && (
                <FormField
                  label={getFieldLabelById(16, 'aadhaarAddress.pincode', 'ZIP/Postal Code')}
                  name="aadhaarAddress.pincode"
                  required={getFieldRequiredById(16, 'aadhaarAddress.pincode', false)}
                  formData={formData}
                  handleChange={handleChange}
                  disabled={formData.aadhaarAddressOption === 'present' || formData.aadhaarAddressOption === 'permanent'}
                />
              )}
              {isFieldVisibleById(16, 'aadhaarAddress.country') && (
                <FormField
                  label={getFieldLabelById(16, 'aadhaarAddress.country', 'Country')}
                  name="aadhaarAddress.country"
                  required={getFieldRequiredById(16, 'aadhaarAddress.country', false)}
                  formData={formData}
                  handleChange={handleChange}
                  disabled={formData.aadhaarAddressOption === 'present' || formData.aadhaarAddressOption === 'permanent'}
                />
              )}
              {renderSchemaExtraFields(16, ['headingPresentAddress', 'presentAddress.line1', 'presentAddress.line2', 'presentAddress.district', 'presentAddress.state', 'presentAddress.pincode', 'presentAddress.country', 'headingPermanentAddress', 'sameAsPresentAddress', 'permanentAddress.line1', 'permanentAddress.line2', 'permanentAddress.district', 'permanentAddress.state', 'permanentAddress.pincode', 'permanentAddress.country', 'headingAadhaarAddress', 'aadhaarSameAsPresent', 'aadhaarSameAsPermanent', 'aadhaarAddressOption', 'aadhaarAddress.line1', 'aadhaarAddress.line2', 'aadhaarAddress.district', 'aadhaarAddress.state', 'aadhaarAddress.pincode', 'aadhaarAddress.country'])}

            </FormSection>

            {/* Family Details (New Section) */}
            <FormSection
              title={getSectionTitleById(13, 'Family Details')}
              sectionId={13}
              isOpen={expandedSections.includes(13)}
              onToggle={() => toggleSection(13)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 13}
              isEditMode={isAddFlow || editingSectionId === 13}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {/* Header */}
              <div className="col-span-full hidden md:grid md:grid-cols-12 gap-4 mb-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
                <div className="col-span-4">{getFieldLabelById(13, 'name', 'Name')}</div>
                <div className="col-span-4">{getFieldLabelById(13, 'relation', 'Relationship')}</div>
                <div className="col-span-3">{getFieldLabelById(13, 'dob', 'DOB')}</div>
                <div className="col-span-1">Action</div>
              </div>

              {(formData.familyDetails || []).map((member, index) => (
                <div key={index} className="col-span-full grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end border-b pb-4 md:border-0 md:pb-0">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 md:hidden">{getFieldLabelById(13, 'name', 'Name')}</label>
                    <input
                      type="text"
                      placeholder={getFieldLabelById(13, 'name', 'Name')}
                      value={member.name}
                      onChange={(e) => handleFamilyDetailChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 md:hidden">{getFieldLabelById(13, 'relation', 'Relationship')}</label>
                    {(() => {
                      const relationshipOptions = getFieldOptionsById(13, 'relation', ['Father', 'Mother', 'Spouse'])
                      const standardRels = relationshipOptions.filter(o => !String(o).toLowerCase().includes('other'))
                      const isCustom = member.relation && (!standardRels.includes(member.relation) || member.relation === 'Other')

                      return (
                        <>
                          {isCustom ? (
                            <input
                              type="text"
                              placeholder={getFieldLabelById(13, 'relation', 'Specify Relationship')}
                              value={member.relation === 'Other' ? '' : (member.relation || '')}
                              onChange={(e) => handleFamilyDetailChange(index, 'relation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              autoFocus
                            />
                          ) : (
                            <select
                              value={member.relation || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                if (val === '__other__') {
                                  handleFamilyDetailChange(index, 'relation', 'Other')
                                } else {
                                  handleFamilyDetailChange(index, 'relation', val)
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="">{getFieldLabelById(13, 'selectRelationship', 'Select Relationship')}</option>
                              {standardRels.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                              <option value="__other__">Other (Specify)</option>
                            </select>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 md:hidden">{getFieldLabelById(13, 'dob', 'DOB')}</label>
                    <input
                      type="date"
                      value={member.dob ? new Date(member.dob).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const dateValue = e.target.value
                        if (dateValue) {
                          const dateParts = dateValue.split('-')
                          if (dateParts.length === 3) {
                            const year = dateParts[0]
                            if (year.length !== 4 || parseInt(year) < 1900 || parseInt(year) > 2100) {
                              toast.error('Please enter a valid date with 4-digit year (1900-2100)')
                              return
                            }
                          }
                        }
                        handleFamilyDetailChange(index, 'dob', dateValue)
                      }}
                      onBlur={(e) => {
                        const dateValue = e.target.value
                        if (dateValue) {
                          const dateParts = dateValue.split('-')
                          if (dateParts.length === 3 && dateParts[0].length !== 4) {
                            toast.error('Year must be exactly 4 digits')
                            e.target.value = ''
                            handleFamilyDetailChange(index, 'dob', '')
                          }
                        }
                      }}
                      min="1900-01-01"
                      max="2100-12-31"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Render schema extra fields inside each family member entry */}
                  <div className="col-span-full mt-2">
                    {renderSchemaExtraFields(13, ['name', 'relation', 'dob', 'addMember', 'selectRelationship'], index, 'familyDetails')}
                  </div>
                </div>
              ))}

              <div className="col-span-full mt-2">
                <button
                  type="button"
                  onClick={addFamilyMember}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {getFieldLabelById(13, 'addMember', 'Add')}
                </button>
              </div>
            </FormSection>





            {/* Employment Information */}
            <FormSection
              title={getSectionTitleById(2, 'Employment Information')}
              sectionId={2}
              isOpen={expandedSections.includes(2)}
              onToggle={() => toggleSection(2)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 2}
              isEditMode={isAddFlow || editingSectionId === 2}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {isFieldVisibleById(2, 'employeeId') && (
                <FormField
                  label={getFieldLabelById(2, 'employeeId', 'Employee ID')}
                  name="employeeId"
                  type={getFieldTypeById(2, 'employeeId', 'text')}
                  required={getFieldRequiredById(2, 'employeeId', true)}
                  formData={formData}
                  handleChange={handleChange}
                  placeholder={getFieldLabelById(2, 'employeeId', 'Employee ID')}
                />
              )}

              {isFieldVisibleById(2, 'officialEmail') && (
                <FormField
                  label={getFieldLabelById(2, 'officialEmail', 'Official Email ID')}
                  name="officialEmail"
                  type={getFieldTypeById(2, 'officialEmail', 'email')}
                  required={getFieldRequiredById(2, 'officialEmail', true)}
                  formData={formData}
                  handleChange={handleChange}
                  placeholder="official.email@company.com"
                />
              )}

              {isFieldVisibleById(2, 'businessUnitHR') && (
                <FormField label={getFieldLabelById(2, 'businessUnitHR', 'Department/Business Unit')} name="businessUnitHR" type="select" options={getFieldOptionsById(2, 'businessUnitHR', ['BU1', 'BU2', 'BU3'])} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(2, 'designation') && (
                <FormField label={getFieldLabelById(2, 'designation', 'Designation')} name="designation" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(2, 'role') && (
                <FormField label={getFieldLabelById(2, 'role', 'Role')} name="role" type="select" required={getFieldRequiredById(2, 'role', true)} options={getFieldOptionsById(2, 'role', roles)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(2, 'employeeStatus') && (
                <FormField label={getFieldLabelById(2, 'employeeStatus', 'Employee Status')} name="employeeStatus" type="select" required={getFieldRequiredById(2, 'employeeStatus', true)} options={getFieldOptionsById(2, 'employeeStatus', ['Active', 'Inactive'])} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(2, 'joiningDate') && (
                <FormField 
                  label={getFieldLabelById(2, 'joiningDate', 'Joining Date')} 
                  name="joiningDate" 
                  type="date" 
                  formData={formData} 
                  handleChange={handleChange}
                  min="1900-01-01"
                  max={(() => {
                    const today = new Date()
                    // Allow dates up to 1 year in the future (for planned hires)
                    const maxDate = new Date(today)
                    maxDate.setFullYear(today.getFullYear() + 1)
                    return maxDate.toISOString().slice(0, 10)
                  })()}
                />
              )}
              {isFieldVisibleById(2, 'probationPeriod') && (
              <div className="col-span-1">
                <FormField 
                  label={getFieldLabelById(2, 'probationPeriod', 'Probation Period (days)')} 
                  name="probationPeriod" 
                  type="number" 
                  formData={formData} 
                  handleChange={(e) => {
                    // Only allow positive integers
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    if (value === '' || parseInt(value) >= 0) {
                      handleChange({ ...e, target: { ...e.target, value } })
                    }
                  }}
                  min="0"
                  placeholder="e.g. 30, 60, 90"
                />
                {(() => {
                  // Probation Action Logic
                  if (formData.joiningDate && formData.probationPeriod && !formData.confirmDate) {
                    const joinDate = new Date(formData.joiningDate)
                    const probDays = parseInt(formData.probationPeriod) || 0
                    const probationEndDate = new Date(joinDate)
                    probationEndDate.setDate(joinDate.getDate() + probDays)
                    const today = new Date()
                    // If Today >= Probation End Date
                    // Reset time parts for accurate date comparison
                    today.setHours(0, 0, 0, 0)
                    probationEndDate.setHours(0, 0, 0, 0)

                    if (today >= probationEndDate) {
                      return (
                        <div className="mt-2 flex gap-2 animate-fadeIn">
                          <button
                            type="button"
                            onClick={() => handleProbationAction('accept')}
                            className="flex-1 bg-green-600 text-white text-xs font-bold py-1.5 px-2 rounded hover:bg-green-700 transition-colors shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProbationAction('reject')}
                            className="flex-1 bg-red-600 text-white text-xs font-bold py-1.5 px-2 rounded hover:bg-red-700 transition-colors shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )
                    }
                  }
                  return null
                })()}
              </div>
              )}
              {isFieldVisibleById(2, 'costCenter') && (
                <FormField label={getFieldLabelById(2, 'costCenter', 'Cost Center')} name="costCenter" formData={formData} handleChange={handleChange} />
              )}
              {renderSchemaExtraFields(2, ['businessUnitHR', 'designation', 'role', 'employeeStatus', 'joiningDate', 'probationPeriod', 'costCenter', 'department', 'cid', 'managerId', 'superManagerId', 'noticePeriod', 'division', 'grade', 'location', 'employeeNumberSeries'])}

            </FormSection>



            {/* Education Details */}
            <FormSection
              title={getSectionTitleById(3, 'Education Details')}
              sectionId={3}
              isOpen={expandedSections.includes(3)}
              onToggle={() => toggleSection(3)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 3}
              isEditMode={isAddFlow || editingSectionId === 3}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              <div className="col-span-full">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{getFieldLabelById(3, 'headingQualifications', 'Qualifications')}</h4>
                {formData.education && formData.education.map((edu, index) => (
                  <div key={index} className="flex flex-col gap-4 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const newEducation = formData.education.filter((_, i) => i !== index)
                        setFormData({ ...formData, education: newEducation })
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(3, 'institute', 'Institute Name')}</label>
                        <input
                          type="text"
                          value={edu.institute || ''}
                          onChange={(e) => {
                            // Only allow alphabets, spaces, and valid special characters (.,-&)
                            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,\-&]/g, '')
                            const newEducation = [...formData.education]
                            newEducation[index].institute = filteredValue
                            setFormData({ ...formData, education: newEducation })
                          }}
                          onKeyPress={(e) => {
                            const char = String.fromCharCode(e.which)
                            if (!/[a-zA-Z\s.,\-&]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                              e.preventDefault()
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault()
                            const pastedText = e.clipboardData.getData('text')
                            const filteredValue = pastedText.replace(/[^a-zA-Z\s.,\-&]/g, '')
                            const newEducation = [...formData.education]
                            newEducation[index].institute = filteredValue
                            setFormData({ ...formData, education: newEducation })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder={getFieldLabelById(3, 'institute', 'Enter Institute Name')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(3, 'degree', 'Degree / Qualification')}</label>
                        {(() => {
                          const degreeOptions = getFieldOptionsById(3, 'degree', ['SSC/CBSE/ICSE', 'Intermediate', 'Diploma', 'UG', 'PG', 'PHD', 'Other'])
                          const standardDegrees = degreeOptions.filter(o => !String(o).toLowerCase().includes('other'))
                          const isCustom = edu.degree && (!standardDegrees.includes(edu.degree) || edu.degree === 'Other')

                          if (isCustom) {
                            return (
                              <input
                                type="text"
                                value={edu.degree === 'Other' ? '' : (edu.degree || '')}
                                onChange={(e) => {
                                  const newEducation = [...formData.education]
                                  newEducation[index].degree = e.target.value
                                  setFormData({ ...formData, education: newEducation })
                                }}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder={getFieldLabelById(3, 'degree', 'Specify Degree/Qualification')}
                                autoFocus
                              />
                            )
                          }

                          return (
                            <select
                              value={edu.degree || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                const newEducation = [...formData.education]
                                if (val === '__other__') {
                                  newEducation[index].degree = 'Other'
                                } else {
                                  newEducation[index].degree = val
                                }
                                setFormData({ ...formData, education: newEducation })
                              }}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="">{getFieldLabelById(3, 'selectDegree', 'Select Degree')}</option>
                              {standardDegrees.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                              <option value="__other__">Others (specify)</option>
                            </select>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(3, 'percentage', 'Percentage / CGPA')}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9.]*"
                          value={edu.percentage || ''}
                          onChange={(e) => {
                            // Filter out non-numeric characters (allow digits and decimal point)
                            const filteredValue = e.target.value.replace(/[^0-9.]/g, '')
                            // Prevent multiple decimal points
                            const parts = filteredValue.split('.')
                            const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredValue
                            const newEducation = [...formData.education]
                            newEducation[index].percentage = finalValue
                            setFormData({ ...formData, education: newEducation })
                          }}
                          onKeyPress={(e) => {
                            // Only allow digits, decimal point, and backspace/delete/arrow keys
                            const char = String.fromCharCode(e.which)
                            if (!/[0-9.]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                              e.preventDefault()
                            }
                            // Prevent multiple decimal points
                            if (char === '.' && e.target.value.includes('.')) {
                              e.preventDefault()
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault()
                            const pastedText = e.clipboardData.getData('text')
                            // Filter out non-numeric characters
                            const filteredValue = pastedText.replace(/[^0-9.]/g, '')
                            const parts = filteredValue.split('.')
                            const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredValue
                            const newEducation = [...formData.education]
                            newEducation[index].percentage = finalValue
                            setFormData({ ...formData, education: newEducation })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder={getFieldLabelById(3, 'percentage', 'e.g. 85% or 8.5')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(3, 'fromDate', 'From')}</label>
                        <input
                          type="month"
                          value={(() => {
                            // Convert date to month format (YYYY-MM) for month input
                            if (!edu.fromDate) return ''
                            const date = new Date(edu.fromDate)
                            if (isNaN(date.getTime())) return ''
                            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                          })()}
                          onChange={(e) => {
                            const newEducation = [...formData.education]
                            const fromMonth = e.target.value
                            
                            // Validate: From date should be before To date
                            if (fromMonth && edu.toDate) {
                              const toDate = new Date(edu.toDate)
                              if (!isNaN(toDate.getTime())) {
                                const toMonth = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}`
                                if (fromMonth > toMonth) {
                                  toast.error('From date must be before To date (e.g., From: 2021, To: 2025)')
                                  return
                                }
                              }
                            }
                            
                            newEducation[index].fromDate = fromMonth ? `${fromMonth}-01` : '' // Store as YYYY-MM-01 for backend compatibility
                            setFormData({ ...formData, education: newEducation })
                          }}
                          max={edu.toDate ? (() => {
                            // Set max to To date if it exists
                            const toDate = new Date(edu.toDate)
                            if (!isNaN(toDate.getTime())) {
                              return `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}`
                            }
                            return ''
                          })() : ''}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(3, 'toDate', 'To')}</label>
                        <input
                          type="month"
                          value={(() => {
                            // Convert date to month format (YYYY-MM) for month input
                            if (!edu.toDate) return ''
                            const date = new Date(edu.toDate)
                            if (isNaN(date.getTime())) return ''
                            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                          })()}
                          onChange={(e) => {
                            const newEducation = [...formData.education]
                            const toMonth = e.target.value
                            
                            // Validate: To date should be after From date
                            if (toMonth && edu.fromDate) {
                              const fromDate = new Date(edu.fromDate)
                              if (!isNaN(fromDate.getTime())) {
                                const fromMonth = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}`
                                if (fromMonth > toMonth) {
                                  toast.error('To date must be after From date (e.g., From: 2021, To: 2025)')
                                  return
                                }
                              }
                            }
                            
                            newEducation[index].toDate = toMonth ? `${toMonth}-01` : '' // Store as YYYY-MM-01 for backend compatibility
                            setFormData({ ...formData, education: newEducation })
                          }}
                          min={edu.fromDate ? (() => {
                            // Set min to From date if it exists
                            const fromDate = new Date(edu.fromDate)
                            if (!isNaN(fromDate.getTime())) {
                              return `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}`
                            }
                            return ''
                          })() : ''}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(3, 'attachment', 'Attachment')}</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                              // Validate PDF only
                              if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                toast.error('Only PDF files are allowed')
                                e.target.value = ''
                                return
                              }
                              const newEducation = [...formData.education]
                              newEducation[index].fileName = file.name
                              // For now we store a local object URL for preview; backend upload can later set a permanent fileUrl
                              if (newEducation[index].fileUrl && newEducation[index].fileUrl.startsWith('blob:')) {
                                try { URL.revokeObjectURL(newEducation[index].fileUrl) } catch { /* revokeObjectURL may throw */ }
                              }
                              newEducation[index].fileUrl = URL.createObjectURL(file)
                              setFormData({ ...formData, education: newEducation })
                              toast.success(`Selected: ${file.name}`)
                            }
                          }}
                          className="text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {edu.fileName && (
                          <>
                            <span className="text-xs text-gray-500 truncate max-w-[120px]">{edu.fileName}</span>
                            {edu.fileUrl && (
                              <div className="flex items-center gap-1">
                                <a
                                  href={edu.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                                >
                                  View
                                </a>
                                <a
                                  href={edu.fileUrl}
                                  download={edu.fileName}
                                  className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                                >
                                  Download
                                </a>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Render schema extra fields inside each qualification entry */}
                    <div className="col-span-full mt-4">
                      {renderSchemaExtraFields(3, ['institute', 'degree', 'percentage', 'fromDate', 'toDate', 'attachment', 'headingQualifications', 'selectDegree', 'addQualification'], index, 'education')}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, education: [...(formData.education || []), { institute: '', degree: '', percentage: '', fromDate: '', toDate: '', fileName: '', fileUrl: '' }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-6"
                >
                  <FiPlus className="w-4 h-4" /> {getFieldLabelById(3, 'addQualification', 'Add Qualification')}
                </button>
              </div>
            </FormSection>

            {/* Languages Known (Separate Section) */}
            <FormSection
              title={getSectionTitleById(14, 'Languages Known')}
              sectionId={14}
              isOpen={expandedSections.includes(14)}
              onToggle={() => toggleSection(14)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 14}
              isEditMode={isAddFlow || editingSectionId === 14}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              <div className="col-span-full">
                {formData.languages && formData.languages.map((lang, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-4 mb-2 items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={lang.name || ''}
                        onChange={(e) => {
                          const newLangs = [...formData.languages]
                          newLangs[index].name = e.target.value
                          setFormData({ ...formData, languages: newLangs })
                        }}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder={getFieldLabelById(14, 'name', 'Language (e.g. English)')}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={lang.read || false}
                          onChange={(e) => {
                            const newLangs = [...formData.languages]
                            newLangs[index].read = e.target.checked
                            setFormData({ ...formData, languages: newLangs })
                          }}
                          className="mr-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        /> {getFieldLabelById(14, 'read', 'Read')}
                      </label>
                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={lang.write || false}
                          onChange={(e) => {
                            const newLangs = [...formData.languages]
                            newLangs[index].write = e.target.checked
                            setFormData({ ...formData, languages: newLangs })
                          }}
                          className="mr-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        /> {getFieldLabelById(14, 'write', 'Write')}
                      </label>
                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={lang.speak || false}
                          onChange={(e) => {
                            const newLangs = [...formData.languages]
                            newLangs[index].speak = e.target.checked
                            setFormData({ ...formData, languages: newLangs })
                          }}
                          className="mr-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        /> {getFieldLabelById(14, 'speak', 'Speak')}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newLangs = formData.languages.filter((_, i) => i !== index)
                        setFormData({ ...formData, languages: newLangs })
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                    
                    {/* Render schema extra fields inside each language entry */}
                    <div className="col-span-full mt-2">
                      {renderSchemaExtraFields(14, ['name', 'read', 'write', 'speak', 'addLanguage'], index, 'languages')}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, languages: [...(formData.languages || []), { name: '', read: false, write: false, speak: false }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <FiPlus className="w-4 h-4" /> {getFieldLabelById(14, 'addLanguage', 'Add Language')}
                </button>
              </div>
            </FormSection>

            {/* Experience Details */}
            <FormSection
              title={getSectionTitleById(10, 'Experience Details')}
              sectionId={10}
              isOpen={expandedSections.includes(10)}
              onToggle={() => toggleSection(10)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 10}
              isEditMode={isAddFlow || editingSectionId === 10}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              <div className="col-span-full">
                {formData.experience && formData.experience.map((exp, index) => (
                  <div key={index} className="flex flex-col gap-4 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const newExperience = formData.experience.filter((_, i) => i !== index)
                        setFormData({ ...formData, experience: newExperience })
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(10, 'organization', 'Organization')}</label>
                        <input
                          type="text"
                          value={exp.organization || ''}
                          onChange={(e) => {
                            // Only allow alphabets, spaces, and valid special characters (.,-&)
                            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,\-&]/g, '')
                            const newExperience = [...formData.experience]
                            newExperience[index].organization = filteredValue
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          onKeyPress={(e) => {
                            const char = String.fromCharCode(e.which)
                            if (!/[a-zA-Z\s.,\-&]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                              e.preventDefault()
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault()
                            const pastedText = e.clipboardData.getData('text')
                            const filteredValue = pastedText.replace(/[^a-zA-Z\s.,\-&]/g, '')
                            const newExperience = [...formData.experience]
                            newExperience[index].organization = filteredValue
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder={getFieldLabelById(10, 'organization', 'Enter Organization Name')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(10, 'designation', 'Position / Designation')}</label>
                        <input
                          type="text"
                          value={exp.designation || ''}
                          onChange={(e) => {
                            // Only allow alphabets, spaces, and valid special characters (.,-&)
                            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,\-&]/g, '')
                            const newExperience = [...formData.experience]
                            newExperience[index].designation = filteredValue
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          onKeyPress={(e) => {
                            const char = String.fromCharCode(e.which)
                            if (!/[a-zA-Z\s.,\-&]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                              e.preventDefault()
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault()
                            const pastedText = e.clipboardData.getData('text')
                            const filteredValue = pastedText.replace(/[^a-zA-Z\s.,\-&]/g, '')
                            const newExperience = [...formData.experience]
                            newExperience[index].designation = filteredValue
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder={getFieldLabelById(10, 'designation', 'Enter Designation')}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(10, 'fromDate', 'From')}</label>
                        <input
                          type="date"
                          value={exp.fromDate ? exp.fromDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const dateValue = e.target.value
                            // Validate 4-digit year
                            if (dateValue) {
                              const dateParts = dateValue.split('-')
                              if (dateParts.length === 3) {
                                const year = dateParts[0]
                                if (year.length !== 4 || parseInt(year) < 1900 || parseInt(year) > 2100) {
                                  toast.error('Please enter a valid date with 4-digit year (1900-2100)')
                                  return
                                }
                              }
                            }
                            
                            const newExperience = [...formData.experience]
                            const fromDate = dateValue
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const selectedDate = new Date(fromDate)
                            selectedDate.setHours(0, 0, 0, 0)
                            
                            if (selectedDate > today) {
                              toast.error('From Date must not be a future date.')
                              return
                            }
                            
                            // Validate From < To
                            if (exp.toDate && fromDate > exp.toDate) {
                              toast.error('From Date must be earlier than To Date.')
                              return
                            }
                            
                            newExperience[index].fromDate = fromDate
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          onBlur={(e) => {
                            const dateValue = e.target.value
                            if (dateValue) {
                              const dateParts = dateValue.split('-')
                              if (dateParts.length === 3 && dateParts[0].length !== 4) {
                                toast.error('Year must be exactly 4 digits')
                                e.target.value = ''
                                const newExperience = [...formData.experience]
                                newExperience[index].fromDate = ''
                                setFormData({ ...formData, experience: newExperience })
                              }
                            }
                          }}
                          min="1900-01-01"
                          max="2100-12-31"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(10, 'toDate', 'To')}</label>
                        <input
                          type="date"
                          value={exp.toDate ? exp.toDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const dateValue = e.target.value
                            // Validate 4-digit year
                            if (dateValue) {
                              const dateParts = dateValue.split('-')
                              if (dateParts.length === 3) {
                                const year = dateParts[0]
                                if (year.length !== 4 || parseInt(year) < 1900 || parseInt(year) > 2100) {
                                  toast.error('Please enter a valid date with 4-digit year (1900-2100)')
                                  return
                                }
                              }
                            }
                            
                            const newExperience = [...formData.experience]
                            const toDate = dateValue
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const selectedDate = new Date(toDate)
                            selectedDate.setHours(0, 0, 0, 0)
                            
                            if (selectedDate > today) {
                              toast.error('To Date must not be a future date.')
                              return
                            }
                            
                            // Validate From < To
                            if (exp.fromDate && toDate < exp.fromDate) {
                              toast.error('To Date must be after From Date.')
                              return
                            }
                            
                            newExperience[index].toDate = toDate
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          onBlur={(e) => {
                            const dateValue = e.target.value
                            if (dateValue) {
                              const dateParts = dateValue.split('-')
                              if (dateParts.length === 3 && dateParts[0].length !== 4) {
                                toast.error('Year must be exactly 4 digits')
                                e.target.value = ''
                                const newExperience = [...formData.experience]
                                newExperience[index].toDate = ''
                                setFormData({ ...formData, experience: newExperience })
                              }
                            }
                          }}
                          min={exp.fromDate || '1900-01-01'}
                          max="2100-12-31"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    {/* Render schema extra fields inside each experience entry */}
                    <div className="col-span-full mt-4">
                      {renderSchemaExtraFields(10, ['organization', 'designation', 'fromDate', 'toDate', 'addExperience'], index, 'experience')}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, experience: [...(formData.experience || []), { organization: '', designation: '', fromDate: '', toDate: '' }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <FiPlus className="w-4 h-4" /> {getFieldLabelById(10, 'addExperience', 'Add Experience')}
                </button>
              </div>
            </FormSection>



            {/* Bank Details */}
            <FormSection
              title={getSectionTitleById(4, 'Bank Details')}
              sectionId={4}
              isOpen={expandedSections.includes(4)}
              onToggle={() => toggleSection(4)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 4}
              isEditMode={isAddFlow || editingSectionId === 4}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {isFieldVisibleById(4, 'accountNumber') && (
              <>
              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {getFieldLabelById(4, 'accountNumber', 'Account Number')}
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={isAccountNumberFocused ? formData.accountNumber : getMaskedAccountNumber(formData.accountNumber)}
                  onChange={handleChange}
                  onFocus={() => setIsAccountNumberFocused(true)}
                  onBlur={() => setIsAccountNumberFocused(false)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={getFieldLabelById(4, 'accountNumber', 'Enter Account Number')}
                />
              </div>

              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {getFieldLabelById(4, 'confirmAccountNumber', 'Confirm Account Number')}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="confirmAccountNumber"
                    value={formData.confirmAccountNumber || ''}
                    onChange={handleChange}
                    className={`w-full px-2.5 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 transition-colors ${formData.confirmAccountNumber && formData.accountNumber
                      ? formData.accountNumber === formData.confirmAccountNumber
                        ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                        : 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    placeholder={getFieldLabelById(4, 'confirmAccountNumber', 'Re-enter Account Number')}
                  />
                  {formData.confirmAccountNumber && formData.accountNumber && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {formData.accountNumber === formData.confirmAccountNumber ? (
                        <span className="text-green-500 text-xs font-semibold">Confirmed</span>
                      ) : (
                        <span className="text-red-500 text-xs font-semibold">Mismatch</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </>
              )}
              {isFieldVisibleById(4, 'bankName') && (
                <FormField label={getFieldLabelById(4, 'bankName', 'Bank Name')} name="bankName" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(4, 'ifscCode') && (
                <div>
                  <FormField label={getFieldLabelById(4, 'ifscCode', 'IFSC Code')} name="ifscCode" formData={formData} handleChange={(e) => {
                    handleChange(e)
                    // Validate IFSC matches bank name
                    if (formData.bankName && e.target.value) {
                      const bankName = String(formData.bankName).toLowerCase()
                      const ifscCode = String(e.target.value).toUpperCase()
                      // Basic IFSC validation: first 4 characters should match bank name
                      const bankCodes = {
                        'canara': 'CNRB', 'canara bank': 'CNRB',
                        'icici': 'ICIC', 'icici bank': 'ICIC',
                        'hdfc': 'HDFC', 'hdfc bank': 'HDFC',
                        'sbi': 'SBIN', 'state bank': 'SBIN',
                        'axis': 'UTIB', 'axis bank': 'UTIB',
                        'pnb': 'PUNB', 'punjab national bank': 'PUNB',
                        'bob': 'BARB', 'bank of baroda': 'BARB',
                        'boi': 'BKID', 'bank of india': 'BKID',
                        'union': 'UBIN', 'union bank': 'UBIN',
                        'iob': 'IOBA', 'indian overseas bank': 'IOBA'
                      }
                      const expectedCode = Object.keys(bankCodes).find(key => bankName.includes(key))
                      if (expectedCode && !ifscCode.startsWith(bankCodes[expectedCode])) {
                        toast.error('Bank Name and IFSC Code do not match. Please enter valid details.')
                      }
                    }
                  }} />
                </div>
              )}
              {isFieldVisibleById(4, 'accountType') && (
                <FormField label={getFieldLabelById(4, 'accountType', 'Account Type')} name="accountType" type="select" options={getFieldOptionsById(4, 'accountType', accountTypes)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(4, 'branchName') && (
                <FormField label={getFieldLabelById(4, 'branchName', 'Branch Name')} name="branchName" formData={formData} handleChange={handleChange} />
              )}

              {isFieldVisibleById(4, 'salaryPaymentMode') && (
                <FormField label={getFieldLabelById(4, 'salaryPaymentMode', 'Salary Payment Mode')} name="salaryPaymentMode" type="select" options={getFieldOptionsById(4, 'salaryPaymentMode', paymentModes)} formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(4, 'nameAsPerBankRecords') && (
                <FormField label={getFieldLabelById(4, 'nameAsPerBankRecords', 'Name as per Bank Records')} name="nameAsPerBankRecords" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(4, 'iban') && (
                <FormField label={getFieldLabelById(4, 'iban', 'IBAN')} name="iban" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(4, 'swiftCode') && (
                <FormField label={getFieldLabelById(4, 'swiftCode', 'Swift Code')} name="swiftCode" formData={formData} handleChange={handleChange} />
              )}
              {renderSchemaExtraFields(4, ['accountNumber', 'confirmAccountNumber', 'bankName', 'ifscCode', 'accountType', 'branchName', 'salaryPaymentMode', 'nameAsPerBankRecords', 'iban', 'swiftCode', 'bankBranch'])}
            </FormSection>

            {/* Documents */}
            <FormSection
              title={getSectionTitleById(5, 'Documents')}
              sectionId={5}
              isOpen={expandedSections.includes(5)}
              onToggle={() => toggleSection(5)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 5}
              isEditMode={isAddFlow || editingSectionId === 5}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              <div className="col-span-full">
                {formData.documents && formData.documents.map((doc, index) => (
                  <div key={index} className="flex flex-col gap-4 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const newDocs = formData.documents.filter((_, i) => i !== index)
                        setFormData({ ...formData, documents: newDocs })
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{getFieldLabelById(5, 'documentType', 'Document Type')} {getFieldRequiredById(5, 'documentType', true) && <span className="text-red-500">*</span>}</label>
                        {(() => {
                          const docTypeOptions = getFieldOptionsById(5, 'documentType', ['Aadhar Card', 'PAN Card', 'Passport', 'Driving License', 'Voter ID', 'Other'])
                          const isOtherDocType = doc.documentType && String(doc.documentType).toLowerCase().includes('other')
                          if (isOtherDocType) {
                            return (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={doc.documentTypeOther || ''}
                                  onChange={(e) => {
                                    const newDocs = [...formData.documents]
                                    newDocs[index].documentTypeOther = e.target.value
                                    setFormData({ ...formData, documents: newDocs })
                                  }}
                                  placeholder={getFieldLabelById(5, 'documentTypeOther', 'Please specify')}
                                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newDocs = [...formData.documents]
                                    newDocs[index].documentType = ''
                                    newDocs[index].documentTypeOther = ''
                                    setFormData({ ...formData, documents: newDocs })
                                  }}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline text-left"
                                >
                                  Choose from list
                                </button>
                              </div>
                            )
                          }
                          return (
                            <select
                              value={doc.documentType || ''}
                              onChange={(e) => {
                                const newDocs = [...formData.documents]
                                const selectedType = e.target.value
                                
                                // Check for duplicate document types
                                if (selectedType && selectedType !== 'Other') {
                                  const existingType = formData.documents.find((d, i) => i !== index && d.documentType === selectedType)
                                  if (existingType) {
                                    toast.error(`${selectedType} already added. Please select a different document type.`)
                                    return
                                  }
                                }
                                
                                newDocs[index].documentType = selectedType
                                newDocs[index].documentNumber = '' // Reset document number when type changes
                                setFormData({ ...formData, documents: newDocs })
                              }}
                              required={getFieldRequiredById(5, 'documentType', true)}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">{getFieldLabelById(5, 'documentType', 'Select Type')}</option>
                              {docTypeOptions.map((opt, i) => {
                                // Disable option if it's already selected in another document
                                const isDuplicate = formData.documents.some((d, idx) => idx !== index && d.documentType === opt && opt !== 'Other')
                                return (
                                  <option key={i} value={opt} disabled={isDuplicate}>
                                    {opt} {isDuplicate ? '(Already added)' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          )
                        })()}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {doc.documentType === 'Aadhar Card' ? 'Aadhaar Number' : getFieldLabelById(5, 'documentNumber', 'Document Number')} 
                          {getFieldRequiredById(5, 'documentNumber', true) && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={doc.documentNumber || ''}
                          onChange={(e) => {
                            const newDocs = [...formData.documents]
                            let value = e.target.value
                            
                            // Aadhaar: 12-digit numeric only
                            if (doc.documentType === 'Aadhar Card') {
                              value = value.replace(/[^0-9]/g, '').slice(0, 12)
                            }
                            // PAN: Format ABCDE1234F (5 alphabets + 4 digits + 1 alphabet)
                            else if (doc.documentType === 'PAN Card') {
                              const panValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                              if (panValue.length <= 5) {
                                value = panValue.replace(/[^A-Z]/g, '')
                              } else if (panValue.length <= 9) {
                                const first5 = panValue.slice(0, 5).replace(/[^A-Z]/g, '')
                                const next4 = panValue.slice(5, 9).replace(/[^0-9]/g, '')
                                value = first5 + next4
                              } else {
                                const first5 = panValue.slice(0, 5).replace(/[^A-Z]/g, '')
                                const next4 = panValue.slice(5, 9).replace(/[^0-9]/g, '')
                                const last1 = panValue.slice(9, 10).replace(/[^A-Z]/g, '')
                                value = first5 + next4 + last1
                              }
                            }
                            
                            newDocs[index].documentNumber = value
                            setFormData({ ...formData, documents: newDocs })
                          }}
                          onKeyPress={(e) => {
                            if (doc.documentType === 'Aadhar Card') {
                              const char = String.fromCharCode(e.which)
                              if (!/[0-9]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                                e.preventDefault()
                              }
                              if (e.target.value.length >= 12 && e.key !== 'Backspace' && e.key !== 'Delete') {
                                e.preventDefault()
                              }
                            } else if (doc.documentType === 'PAN Card') {
                              const char = String.fromCharCode(e.which).toUpperCase()
                              const currentLength = e.target.value.length
                              if (currentLength < 5) {
                                // First 5: alphabets only
                                if (!/[A-Z]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                                  e.preventDefault()
                                }
                              } else if (currentLength < 9) {
                                // Next 4: digits only
                                if (!/[0-9]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                                  e.preventDefault()
                                }
                              } else if (currentLength < 10) {
                                // Last 1: alphabet only
                                if (!/[A-Z]/.test(char) && !e.ctrlKey && !e.metaKey && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                                  e.preventDefault()
                                }
                              } else if (e.key !== 'Backspace' && e.key !== 'Delete') {
                                e.preventDefault()
                              }
                            }
                          }}
                          maxLength={doc.documentType === 'Aadhar Card' ? 12 : doc.documentType === 'PAN Card' ? 10 : undefined}
                          required={getFieldRequiredById(5, 'documentNumber', true)}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder={doc.documentType === 'Aadhar Card' ? '12-digit Aadhaar Number' : doc.documentType === 'PAN Card' ? 'ABCDE1234F' : getFieldLabelById(5, 'documentNumber', 'Enter Number')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {getFieldLabelById(5, 'attachment', 'Attachment')} {getFieldRequiredById(5, 'attachment', true) && <span className="text-red-500">*</span>}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) {
                                // Validate PDF only
                                if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                  toast.error('Only PDF files are allowed')
                                  e.target.value = ''
                                  return
                                }
                                const newDocs = [...formData.documents]
                                newDocs[index].fileName = file.name
                                setFormData({ ...formData, documents: newDocs })
                                toast.success(`Selected: ${file.name}`)
                              }
                            }}
                            required={getFieldRequiredById(5, 'attachment', true) && !doc.fileName}
                            className="text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          />
                          {doc.fileName && <span className="text-xs text-gray-500 truncate max-w-[100px]">{doc.fileName}</span>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Render schema extra fields inside each document entry */}
                    <div className="col-span-full mt-4">
                      {renderSchemaExtraFields(5, ['documentType', 'documentNumber', 'attachment', 'addDocument'], index, 'documents')}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, documents: [...(formData.documents || []), { documentType: '', documentNumber: '', fileName: '', documentTypeOther: '' }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <FiPlus className="w-4 h-4" /> {getFieldLabelById(5, 'addDocument', 'Add Document')}
                </button>
              </div>
            </FormSection>

            {/* PF Details */}
            <FormSection
              title={getSectionTitleById(6, 'PF Details')}
              sectionId={6}
              isOpen={expandedSections.includes(6)}
              onToggle={() => toggleSection(6)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 6}
              isEditMode={isAddFlow || editingSectionId === 6}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {isFieldVisibleById(6, 'isEligibleForPF') && (
                <FormField label={getFieldLabelById(6, 'isEligibleForPF', 'Is Employee Eligible for PF')} name="isEligibleForPF" type="checkbox" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'pfNumber') && (
                <FormField label={getFieldLabelById(6, 'pfNumber', 'PF Number')} name="pfNumber" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'pfScheme') && (
                <FormField label={getFieldLabelById(6, 'pfScheme', 'PF Scheme')} name="pfScheme" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'pfJoiningDate') && (
                <FormField label={getFieldLabelById(6, 'pfJoiningDate', 'PF Joining Date')} name="pfJoiningDate" type="date" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'eligibleForExcessEPFContribution') && (
                <FormField label={getFieldLabelById(6, 'eligibleForExcessEPFContribution', 'Eligible for Excess EPF Contribution')} name="eligibleForExcessEPFContribution" type="checkbox" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'isEligibleForExcessEPSContribution') && (
                <FormField label={getFieldLabelById(6, 'isEligibleForExcessEPSContribution', 'Is Employee Eligible for Excess EPS Contribution')} name="isEligibleForExcessEPSContribution" type="checkbox" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'isExistingMemberOfPF') && (
                <FormField label={getFieldLabelById(6, 'isExistingMemberOfPF', 'Is Existing Member of PF')} name="isExistingMemberOfPF" type="checkbox" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'salary') && (
                <FormField label={getFieldLabelById(6, 'salary', 'Salary')} name="salary" type="number" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(6, 'universalAccountNumber') && (
                <FormField label={getFieldLabelById(6, 'universalAccountNumber', 'Universal Account Number')} name="universalAccountNumber" formData={formData} handleChange={handleChange} />
              )}
              {renderSchemaExtraFields(6, ['isEligibleForPF', 'pfNumber', 'pfScheme', 'pfJoiningDate', 'eligibleForExcessEPFContribution', 'isEligibleForExcessEPSContribution', 'isExistingMemberOfPF', 'salary', 'universalAccountNumber'])}
            </FormSection>

            {/* ESI Details */}
            <FormSection
              title={getSectionTitleById(7, 'ESI Details')}
              sectionId={7}
              isOpen={expandedSections.includes(7)}
              onToggle={() => toggleSection(7)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 7}
              isEditMode={isAddFlow || editingSectionId === 7}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {isFieldVisibleById(7, 'isEligibleForESI') && (
                <FormField label={getFieldLabelById(7, 'isEligibleForESI', 'Is Employee Eligible for ESI')} name="isEligibleForESI" type="checkbox" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(7, 'esiNumber') && (
                <FormField label={getFieldLabelById(7, 'esiNumber', 'ESI Number')} name="esiNumber" formData={formData} handleChange={handleChange} />
              )}
              {isFieldVisibleById(7, 'isCoveredUnderLWF') && (
                <FormField label={getFieldLabelById(7, 'isCoveredUnderLWF', 'Is Covered Under LWF')} name="isCoveredUnderLWF" type="checkbox" formData={formData} handleChange={handleChange} />
              )}
              {renderSchemaExtraFields(7, ['isEligibleForESI', 'esiNumber', 'isCoveredUnderLWF'])}
            </FormSection>

            {/* Account Setup */}
            <FormSection
              title={getSectionTitleById(8, 'Account Setup')}
              sectionId={8}
              isOpen={expandedSections.includes(8)}
              onToggle={() => toggleSection(8)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 8}
              isEditMode={isAddFlow || editingSectionId === 8}
              onEditClick={handleSectionEditClick}
              showEditButton={!isAddFlow}
            >
              {isFieldVisibleById(8, 'password') && (
                <FormField
                  label={getFieldLabelById(8, 'password', 'Password')}
                  name="password"
                  type="password"
                  required={!editingEmployee || isNewEntry}
                  placeholder={(!editingEmployee || isNewEntry) ? "Enter password" : "Leave blank to keep current password"}
                  formData={formData}
                  handleChange={handleChange}
                />
              )}
              {renderSchemaExtraFields(8, ['password'])}
            </FormSection>
          </div>

        </form>
      </div >

      {/* Delete Confirmation Modal */}
      {
        deleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold">
                    {deleteConfirmation.fullName || `${deleteConfirmation.firstName || ''} ${deleteConfirmation.lastName || ''}`.trim() || deleteConfirmation.email}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    disabled={deleting}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}

export default UserManagement
