import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import axiosInstance from '../../../utils/axiosInstance'
import toast from 'react-hot-toast'
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiMove, FiEye,
    FiChevronDown, FiChevronUp, FiSettings, FiCopy
} from 'react-icons/fi'

const FormBuilder = () => {
    const { token } = useAuth()
    const [loading, setLoading] = useState(true)
    const [config, setConfig] = useState(null)
    const [sections, setSections] = useState([])
    const [expandedSection, setExpandedSection] = useState(null)
    const [editingSection, setEditingSection] = useState(null)
    const [editingField, setEditingField] = useState(null)
    const [showPreview, setShowPreview] = useState(false)

    // Form states
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

    useEffect(() => {
        if (token) {
            fetchFormConfig()
        }
    }, [token])

    const fetchFormConfig = async () => {
        try {
            setLoading(true)
            const response = await axiosInstance.get('/api/form-config/employee')
            setConfig(response.data.config)
            setSections(response.data.config.sections || [])
        } catch (error) {
            if (error.response?.status === 404) {
                // No config exists, create empty one
                toast('No form configuration found. Create your first section!', { icon: 'ℹ️' })
                setSections([])
            } else {
                console.error('Fetch config error:', error)
                toast.error('Failed to load form configuration')
            }
        } finally {
            setLoading(false)
        }
    }

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

            if (editingSection === 'new') {
                // Add new section
                const newSections = [...sections, sectionForm]
                await saveConfig(newSections)
                toast.success('Section added successfully')
            } else {
                // Update existing section
                const updatedSections = sections.map(s =>
                    s.id === editingSection ? sectionForm : s
                )
                await saveConfig(updatedSections)
                toast.success('Section updated successfully')
            }

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
                    if (fieldName === 'new') {
                        // Add new field
                        return {
                            ...section,
                            fields: [...(section.fields || []), { ...fieldForm, order: section.fields?.length || 0 }]
                        }
                    } else {
                        // Update existing field
                        return {
                            ...section,
                            fields: section.fields.map(f => f.name === fieldName ? fieldForm : f)
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
                        fields: section.fields.filter(f => f.name !== fieldName)
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
            if (config) {
                // Update existing config
                await axiosInstance.put(`/api/form-config/${config._id}`, {
                    sections: updatedSections
                })
            } else {
                // Create new config
                const response = await axiosInstance.post('/api/form-config', {
                    formType: 'employee',
                    formName: 'Employee Form',
                    description: 'Dynamic employee registration form',
                    sections: updatedSections
                })
                setConfig(response.data.config)
            }
            setSections(updatedSections)
        } catch (error) {
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
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Form Builder...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <FiSettings className="text-blue-600 text-base" />
                        Schema Configuration
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        Manage form sections and fields
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1.5"
                    >
                        <FiEye size={14} /> {showPreview ? 'Hide' : 'Show'}
                    </button>
                    <button
                        onClick={handleAddSection}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <FiPlus size={14} /> Add Section
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Form Builder Panel */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sections & Fields</h2>

                    {sections.length === 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded p-6 text-center">
                            <FiSettings className="mx-auto text-3xl text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">No sections yet. Click "Add Section" to get started!</p>
                        </div>
                    )}

                    {sections.map((section, sectionIndex) => (
                        <div key={section.id} className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
                            {/* Section Header */}
                            <div className="p-2.5 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                                        {section.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{section.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                                            className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                        >
                                            {expandedSection === section.id ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleEditSection(section)}
                                            className="p-1.5 text-blue-600 hover:text-blue-700"
                                        >
                                            <FiEdit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className="p-1.5 text-red-600 hover:text-red-700"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section Fields */}
                            {expandedSection === section.id && (
                                <div className="p-2.5 space-y-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Fields ({section.fields?.length || 0})
                                        </span>
                                        <button
                                            onClick={() => handleAddField(section.id)}
                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                        >
                                            <FiPlus size={12} /> Add
                                        </button>
                                    </div>

                                    {section.fields?.map((field) => (
                                        <div key={field.name} className="bg-gray-50 dark:bg-gray-700 rounded p-2 flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{field.label}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    {field.name} • {field.type} {field.required && '• Required'}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEditField(section.id, field)}
                                                    className="p-1 text-blue-600 hover:text-blue-700"
                                                >
                                                    <FiEdit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteField(section.id, field.name)}
                                                    className="p-1 text-red-600 hover:text-red-700"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {(!section.fields || section.fields.length === 0) && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                                            No fields. Click "Add" to create one.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Editor Panel */}
                <div className="space-y-3">
                    {/* Section Editor */}
                    {editingSection && (
                        <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 p-3">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                {editingSection === 'new' ? 'Add New Section' : 'Edit Section'}
                            </h3>
                            <div className="space-y-2.5">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Section ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={sectionForm.id}
                                        onChange={(e) => setSectionForm({ ...sectionForm, id: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="e.g., basic-info"
                                        disabled={editingSection !== 'new'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Section Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={sectionForm.title}
                                        onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="e.g., Basic Information"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={sectionForm.description}
                                        onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        rows="2"
                                        placeholder="Optional description"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveSection}
                                        className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1.5"
                                    >
                                        <FiSave size={14} /> Save
                                    </button>
                                    <button
                                        onClick={() => setEditingSection(null)}
                                        className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                                    >
                                        <FiX size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Field Editor */}
                    {editingField && (
                        <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 p-3 max-h-[500px] overflow-y-auto">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                {editingField.fieldName === 'new' ? 'Add New Field' : 'Edit Field'}
                            </h3>
                            <div className="space-y-2.5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Field Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={fieldForm.name}
                                        onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="e.g., firstName (database field name)"
                                        disabled={editingField.fieldName !== 'new'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Label <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={fieldForm.label}
                                        onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="e.g., First Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Field Type
                                        </label>
                                        <select
                                            value={fieldForm.type}
                                            onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            {widthOptions.map(width => (
                                                <option key={width.value} value={width.value}>{width.label}</option>
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
                                            className="rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Required Field</span>
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
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Placeholder text"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Help Text
                                    </label>
                                    <input
                                        type="text"
                                        value={fieldForm.helpText}
                                        onChange={(e) => setFieldForm({ ...fieldForm, helpText: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Helper text shown below field"
                                    />
                                </div>

                                {/* Options for select/radio */}
                                {(fieldForm.type === 'select' || fieldForm.type === 'radio') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Options
                                        </label>
                                        {fieldForm.options.map((option, index) => (
                                            <div key={index} className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    placeholder={`Option ${index + 1}`}
                                                />
                                                <button
                                                    onClick={() => handleRemoveOption(index)}
                                                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleAddOption}
                                            className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500"
                                        >
                                            + Add Option
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-3">
                                    <button
                                        onClick={handleSaveField}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                                    >
                                        <FiSave /> Save Field
                                    </button>
                                    <button
                                        onClick={() => setEditingField(null)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!editingSection && !editingField && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Select a section or field to edit, or add a new one
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FormBuilder
