import React, { useState, useEffect, useCallback } from 'react'
import axiosInstance from '../../../utils/axiosInstance'
import { FiChevronUp, FiChevronDown, FiEye, FiEyeOff } from 'react-icons/fi'
import LoadingSpinner from '../../common/LoadingSpinner'
import toast from 'react-hot-toast'
import { getProfileImageUrl } from '../../../config/apiConfig'
import { SECTION_ID_MAP, getSectionKey } from '../../../utils/formConfigHelpers'

function MyInfo() {
  const [userData, setUserData] = useState(null)
  const [formConfig, setFormConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState({})
  const [visibleSensitiveFields, setVisibleSensitiveFields] = useState({}) // Track which sensitive fields are visible

  // Fetch form schema and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Fetch form schema
        const configRes = await axiosInstance.get(`/api/form-config/employee?t=${Date.now()}`)
        const config = configRes.data?.config || null
        setFormConfig(config)

        // Fetch user data
        const userRes = await axiosInstance.get('/api/auth/me')
        const fetchedUser = userRes.data.user || userRes.data
        // Ensure _id is preserved for image URL generation
        if (fetchedUser) {
          if (!fetchedUser._id && fetchedUser.id) {
            fetchedUser._id = fetchedUser.id
          }
          // Debug: Log profileImage value to see what we're getting
          console.log('MyInfo - Fetched user profileImage:', fetchedUser.profileImage, 'User ID:', fetchedUser._id || fetchedUser.id)
        }
        setUserData(fetchedUser)

        // Initialize expanded sections - expand first few by default
        if (config?.sections) {
          const initialExpanded = {}
          config.sections.slice(0, 3).forEach((sec) => {
            const sectionId = Object.entries(SECTION_ID_MAP).find(([, key]) => key === sec.id)?.[0]
            if (sectionId) {
              initialExpanded[sectionId] = true
            }
          })
          setExpandedSections(initialExpanded)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load your information')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper to get section config by sectionId
  const getSectionConfigById = useCallback((sectionId) => {
    const sectionKey = getSectionKey(sectionId)
    if (!sectionKey || !formConfig?.sections) return null
    return formConfig.sections.find(s => s.id === sectionKey)
  }, [formConfig])

  // Helper to get field label
  const getFieldLabel = useCallback((sectionId, fieldName, defaultLabel) => {
    const section = getSectionConfigById(sectionId)
    if (!section?.fields) return defaultLabel
    const field = section.fields.find(f => f.name === fieldName)
    return field?.label || defaultLabel
  }, [getSectionConfigById])

  // Helper to get section title
  // const getSectionTitle = useCallback((sectionId, defaultTitle) => {
  //   const section = getSectionConfigById(sectionId)
  //   return section?.title || defaultTitle
  // }, [getSectionConfigById])

  // Check if field is visible
  const isFieldVisible = useCallback((sectionId, fieldName) => {
    const section = getSectionConfigById(sectionId)
    if (!section?.fields) return true
    const field = section.fields.find(f => f.name === fieldName)
    return field?.isActive !== false
  }, [getSectionConfigById])

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const formatDate = (date) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return String(date)
    }
  }

  // Get field value helper
  const getFieldValue = (fieldName, data = userData) => {
    if (!data) return null
    
    // Handle nested fields (e.g., presentAddress.line1)
    if (fieldName.includes('.')) {
      const parts = fieldName.split('.')
      let value = data
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part]
        } else {
          return null
        }
      }
      return value
    }
    
    return data[fieldName]
  }

  // Check if field is sensitive (needs eye icon)
  const isSensitiveField = (fieldName) => {
    const sensitiveFields = [
      'accountNumber', 'ifscCode', 'bankName', 'branchName', 'bankBranch',
      'pfNumber', 'universalAccountNumber', 'esiNumber',
      'aadharNumber', 'aadhaarNumber', 'panNumber', 'passportNumber', 
      'drivingLicense', 'voterId', 'documentNumber'
    ]
    return sensitiveFields.some(f => fieldName.toLowerCase().includes(f.toLowerCase()))
  }

  // Render field value based on type
  const renderFieldValue = (sectionId, fieldName, fieldType = 'text', showValue = true) => {
    const value = getFieldValue(fieldName)
    
    if (value === null || value === undefined || value === '') return ''
    
    // Handle dates
    if (fieldType === 'date' || fieldName.toLowerCase().includes('date')) {
      return formatDate(value)
    }
    
    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    // Handle arrays (for display, show count or first item)
    if (Array.isArray(value)) {
      if (value.length === 0) return ''
      return `${value.length} item(s)`
    }
    
    // For sensitive fields, mask if not visible
    if (isSensitiveField(fieldName) && !showValue) {
      const strValue = String(value)
      if (strValue.length <= 4) return 'XXXX'
      return 'XXXXXXXX' + strValue.slice(-4)
    }
    
    return String(value)
  }

  // Render a single field
  const renderField = (sectionId, fieldName, fieldType = 'text') => {
    if (!isFieldVisible(sectionId, fieldName)) return null
    
    const label = getFieldLabel(sectionId, fieldName, fieldName)
    const value = getFieldValue(fieldName)
    const isSensitive = isSensitiveField(fieldName) && value
    const isVisible = visibleSensitiveFields[fieldName] || false
    
    // Don't render if no value (show blank)
    if (value === null || value === undefined || value === '') {
      return null
    }
    
    // Special handling for profile image
    if (fieldName === 'profileImage' && userData?.profileImage) {
      const userId = userData._id || userData.id
      const imageUrl = getProfileImageUrl(userData.profileImage, userId)
      
      return (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <img
            src={imageUrl}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
            onError={(e) => {
              console.error('Profile image failed to load:', imageUrl, 'User ID:', userId, 'ProfileImage value:', userData.profileImage)
              e.target.style.display = 'none'
              const parent = e.target.parentElement
              if (parent && !parent.querySelector('.profile-fallback')) {
                const fallback = document.createElement('div')
                fallback.className = 'profile-fallback w-24 h-24 rounded-full bg-indigo-500 text-white flex items-center justify-center text-2xl font-bold border-2 border-gray-200 dark:border-gray-700'
                const initials = (userData?.fullName || userData?.firstName || 'U').charAt(0).toUpperCase()
                fallback.textContent = initials
                parent.appendChild(fallback)
              }
            }}
            onLoad={() => {
              console.log('Profile image loaded successfully:', imageUrl)
            }}
          />
        </div>
      )
    }
    
    // Handle sensitive fields with eye icon
    if (isSensitive) {
      const displayValue = renderFieldValue(sectionId, fieldName, fieldType, isVisible)
      return (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{displayValue}</p>
            <button
              onClick={() => setVisibleSensitiveFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] }))}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              title={isVisible ? 'Hide' : 'Show'}
            >
              {isVisible ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )
    }
    
    // Regular field
    const displayValue = renderFieldValue(sectionId, fieldName, fieldType, true)
    return (
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{displayValue}</p>
      </div>
    )
  }

  // Render array section (education, experience, documents, familyDetails)
  const renderArraySection = (sectionId, arrayData) => {
    if (!Array.isArray(arrayData) || arrayData.length === 0) {
      return null // Show blank instead of "—"
    }

    const section = getSectionConfigById(sectionId)
    const fields = section?.fields || []

    return (
      <div className="space-y-4">
        {arrayData.map((item, index) => {
          const itemFields = fields
            .filter(f => f.isActive !== false && !['addExperience', 'addQualification', 'addDocument', 'addMember'].includes(f.name))
            .map(field => {
              const value = item[field.name]
              if (value === null || value === undefined || value === '') return null
              
              const fieldKey = `${sectionId}-${index}-${field.name}`
              const isSensitive = isSensitiveField(field.name)
              const isVisible = visibleSensitiveFields[fieldKey] || false
              
              let displayValue = value
              if (field.type === 'date' || field.name.toLowerCase().includes('date')) {
                displayValue = formatDate(value)
              } else if (typeof value === 'boolean') {
                displayValue = value ? 'Yes' : 'No'
              } else {
                displayValue = String(value)
              }
              
              // Mask sensitive fields if not visible
              if (isSensitive && !isVisible) {
                const strValue = String(value)
                displayValue = strValue.length <= 4 ? 'XXXX' : 'XXXXXXXX' + strValue.slice(-4)
              }
              
              return { field, displayValue, isSensitive, fieldKey, value }
            })
            .filter(Boolean)
          
          if (itemFields.length === 0) return null
          
          return (
            <div key={index} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemFields.map(({ field, displayValue, isSensitive, fieldKey }) => (
                  <div key={field.name}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{field.label || field.name}</p>
                    {isSensitive ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{displayValue}</p>
                        <button
                          onClick={() => setVisibleSensitiveFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                          title={visibleSensitiveFields[fieldKey] ? 'Hide' : 'Show'}
                        >
                          {(visibleSensitiveFields[fieldKey] || false) ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{displayValue}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Render a section
  const renderSection = (sectionId) => {
    const section = getSectionConfigById(sectionId)
    if (!section || section.isActive === false) return null

    const sectionKey = getSectionKey(sectionId)
    const isExpanded = expandedSections[sectionId] !== false
    const title = section.title || `Section ${sectionId}`
    const fields = section.fields || []

    // Array sections
    const arraySections = {
      3: 'education',
      10: 'experience',
      5: 'documents',
      13: 'familyDetails'
    }
    const arrayKey = arraySections[sectionId]

    return (
      <div key={sectionId} id={sectionKey} className="mb-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">{title}</h2>
          <button
            onClick={() => toggleSection(sectionId)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
          </button>
        </div>
        {isExpanded && (
          <div className="p-4">
            {arrayKey ? (
              renderArraySection(sectionId, userData?.[arrayKey], title)
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fields
                  .filter(f => f.isActive !== false)
                  .map(field => {
                    // Skip array fields that are handled separately
                    if (['education', 'experience', 'documents', 'familyDetails'].includes(field.name)) return null
                    
                    const renderedField = renderField(sectionId, field.name, field.type)
                    if (!renderedField) return null
                    
                    return (
                      <div key={field.name}>
                        {renderedField}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!userData || !formConfig) {
    return (
      <div className="p-6">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  // Get all active sections from schema, sorted by order, excluding Account Setup (other-info / section 8)
  const activeSections = formConfig.sections
    ?.filter(s => s.isActive !== false && s.id !== 'other-info' && s.id !== 'account-setup')
    .sort((a, b) => (a.order || 0) - (b.order || 0)) || []

  // Build section ID list from active sections, excluding section 8 (Account Setup)
  const sectionIds = activeSections
    .map(sec => {
      const entry = Object.entries(SECTION_ID_MAP).find(([, key]) => key === sec.id)
      return entry ? parseInt(entry[0]) : null
    })
    .filter(Boolean)
    .filter(id => id !== 8) // Exclude Account Setup section

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Info Heading - Outside card */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">My Info</h1>

        {/* Card with sections */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Render all sections dynamically */}
          {sectionIds.map(sectionId => renderSection(sectionId))}
        </div>
      </div>
    </div>
  )
}

export default MyInfo
