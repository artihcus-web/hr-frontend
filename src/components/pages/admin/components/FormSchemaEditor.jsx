import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../../../utils/axiosInstance'
import toast from 'react-hot-toast'
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiChevronDown, FiChevronUp, FiArrowLeft
} from 'react-icons/fi'
import LoadingSpinner from '../../../common/LoadingSpinner'

const FormSchemaEditor = ({ formType, formName }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState([])
  const [expandedSection, setExpandedSection] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [editingField, setEditingField] = useState(null)

  const [sectionForm, setSectionForm] = useState({
    id: '',
    title: '',
    description: '',
    order: 0,
    isActive: true
  })

  const [fieldForm, setFieldForm] = useState({
    name: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    helpText: '',
    options: [],
    validation: {},
    order: 0,
    width: 'full',
    isActive: true
  })

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'alphanumeric', label: 'Alphanumeric' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'file', label: 'File Upload' },
    { value: 'tel', label: 'Phone' }
  ]

  const widthOptions = [
    { value: 'full', label: 'Full Width' },
    { value: 'half', label: 'Half Width' },
    { value: 'third', label: 'Third Width' },
    { value: 'quarter', label: 'Quarter Width' }
  ]

  const fetchFormConfig = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(`/api/form-config/${formType}`)
      setSections(response.data.config?.sections || [])
    } catch (error) {
      if (error.response?.status === 404) {
        setSections([])
      } else {
        console.error('Fetch config error:', error)
        toast.error('Failed to load form configuration')
      }
    } finally {
      setLoading(false)
    }
  }, [formType])

  useEffect(() => {
    fetchFormConfig()
  }, [fetchFormConfig])

  const handleAddSection = () => {
    setEditingSection('new')
    setSectionForm({
      id: `section-${Date.now()}`,
      title: '',
      description: '',
      order: sections.length,
      isActive: true
    })
  }

  const handleEditSection = (section) => {
    setEditingSection(section.id)
    setSectionForm({ ...section })
  }

  const handleSaveSection = async () => {
    try {
      if (!sectionForm.title || !sectionForm.id) {
        toast.error('Section ID and Title are required')
        return
      }

      let updatedSections
      if (editingSection === 'new') {
        updatedSections = [...sections, { ...sectionForm, fields: [] }]
      } else {
        updatedSections = sections.map(s =>
          s.id === editingSection ? { ...sectionForm, fields: s.fields || [] } : s
        )
      }

      await saveConfig(updatedSections)
      toast.success(editingSection === 'new' ? 'Section added successfully' : 'Section updated successfully')
      setEditingSection(null)
      setSectionForm({ id: '', title: '', description: '', order: 0, isActive: true })
    } catch (error) {
      console.error('Save section error:', error)
      toast.error('Failed to save section')
    }
  }

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section? All fields will be removed.')) {
      return
    }

    try {
      const updatedSections = sections.filter(s => s.id !== sectionId)
      await saveConfig(updatedSections)
      toast.success('Section deleted successfully')
    } catch (error) {
      console.error('Delete section error:', error)
      toast.error('Failed to delete section')
    }
  }

  const handleAddField = (sectionId) => {
    setEditingField({ sectionId, fieldName: 'new' })
    setFieldForm({
      name: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      helpText: '',
      options: [],
      validation: {},
      order: 0,
      width: 'full',
      isActive: true
    })
  }

  const handleEditField = (sectionId, field) => {
    setEditingField({ sectionId, fieldName: field.name })
    setFieldForm({ ...field, options: field.options || [] })
  }

  const handleSaveField = async () => {
    try {
      if (!fieldForm.name || !fieldForm.label) {
        toast.error('Field name and label are required')
        return
      }

      const { sectionId, fieldName } = editingField
      const updatedSections = sections.map(section => {
        if (section.id === sectionId) {
          const fields = section.fields || []
          if (fieldName === 'new') {
            return {
              ...section,
              fields: [...fields, { ...fieldForm, order: fields.length }]
            }
          } else {
            return {
              ...section,
              fields: fields.map(f => f.name === fieldName ? fieldForm : f)
            }
          }
        }
        return section
      })

      await saveConfig(updatedSections)
      toast.success(fieldName === 'new' ? 'Field added successfully' : 'Field updated successfully')
      setEditingField(null)
      setFieldForm({
        name: '', label: '', type: 'text', required: false, placeholder: '',
        helpText: '', options: [], validation: {}, order: 0, width: 'full', isActive: true
      })
    } catch (error) {
      console.error('Save field error:', error)
      toast.error('Failed to save field')
    }
  }

  const handleDeleteField = async (sectionId, fieldName) => {
    if (!window.confirm('Are you sure you want to delete this field?')) {
      return
    }

    try {
      const updatedSections = sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            fields: (section.fields || []).filter(f => f.name !== fieldName)
          }
        }
        return section
      })

      await saveConfig(updatedSections)
      toast.success('Field deleted successfully')
    } catch (error) {
      console.error('Delete field error:', error)
      toast.error('Failed to delete field')
    }
  }

  const saveConfig = async (updatedSections) => {
    try {
      // Update by formType - backend will create if doesn't exist
      await axiosInstance.put(`/api/form-config/type/${formType}`, {
        sections: updatedSections
      })
      setSections(updatedSections)
    } catch (error) {
      console.error('Save config error:', error)
      throw error
    }
  }

  const handleAddOption = () => {
    setFieldForm({
      ...fieldForm,
      options: [...fieldForm.options, '']
    })
  }

  const handleUpdateOption = (index, value) => {
    const newOptions = [...fieldForm.options]
    newOptions[index] = value
    setFieldForm({ ...fieldForm, options: newOptions })
  }

  const handleRemoveOption = (index) => {
    setFieldForm({
      ...fieldForm,
      options: fieldForm.options.filter((_, i) => i !== index)
    })
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/form-builder')}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Schema Configuration
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure form sections and fields
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sections List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sections</h2>
                <button
                  onClick={handleAddSection}
                  className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      expandedSection === section.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {expandedSection === section.id ? (
                            <FiChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <FiChevronUp className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {section.title || `Section ${index + 1}`}
                          </span>
                        </div>
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditSection(section)}
                          className="p-1 text-gray-600 hover:text-indigo-600"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="p-1 text-gray-600 hover:text-red-600"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {expandedSection === section.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Fields ({section.fields?.length || 0})
                          </span>
                          <button
                            onClick={() => handleAddField(section.id)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <FiPlus className="w-3 h-3" /> Add Field
                          </button>
                        </div>
                        <div className="space-y-1">
                          {(section.fields || []).map((field) => (
                            <div
                              key={field.name}
                              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded text-xs"
                            >
                              <span className="text-gray-700 dark:text-gray-300">{field.label}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditField(section.id, field)}
                                  className="text-indigo-600 hover:text-indigo-700"
                                >
                                  <FiEdit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteField(section.id, field.name)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editor Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              {editingSection && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {editingSection === 'new' ? 'Add New Section' : 'Edit Section'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Section ID *
                      </label>
                      <input
                        type="text"
                        value={sectionForm.id}
                        onChange={(e) => setSectionForm({ ...sectionForm, id: e.target.value })}
                        disabled={editingSection !== 'new'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={sectionForm.title}
                        onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={sectionForm.description}
                        onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveSection}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"
                      >
                        <FiSave /> Save Section
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editingField && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {editingField.fieldName === 'new' ? 'Add New Field' : 'Edit Field'}
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Field Name *
                        </label>
                        <input
                          type="text"
                          value={fieldForm.name}
                          onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                          disabled={editingField.fieldName !== 'new'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={fieldForm.label}
                          onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type *
                        </label>
                        <select
                          value={fieldForm.type}
                          onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          {fieldTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Width
                        </label>
                        <select
                          value={fieldForm.width}
                          onChange={(e) => setFieldForm({ ...fieldForm, width: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          {widthOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={fieldForm.required}
                          onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Required Field</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={fieldForm.placeholder}
                        onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Help Text
                      </label>
                      <textarea
                        value={fieldForm.helpText}
                        onChange={(e) => setFieldForm({ ...fieldForm, helpText: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    {(fieldForm.type === 'select' || fieldForm.type === 'radio') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Options
                        </label>
                        <div className="space-y-2">
                          {fieldForm.options.map((opt, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder={`Option ${index + 1}`}
                              />
                              <button
                                onClick={() => handleRemoveOption(index)}
                                className="px-3 py-2 text-red-600 hover:text-red-700"
                              >
                                <FiX />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={handleAddOption}
                            className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-500"
                          >
                            + Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={handleSaveField}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"
                      >
                        <FiSave /> Save Field
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!editingSection && !editingField && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">Select a section or field to edit, or add a new one</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormSchemaEditor
