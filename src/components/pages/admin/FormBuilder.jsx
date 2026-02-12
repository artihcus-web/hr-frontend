import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import axiosInstance from '../../../utils/axiosInstance'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiSettings, FiUsers, FiFileText, FiGrid } from 'react-icons/fi'
import LoadingSpinner from '../../common/LoadingSpinner'

const DEFAULT_FORM_TYPES = [
  { id: 'employee', name: 'Employee Form', slug: 'employee', description: 'Manage employee registration and profile form fields', icon: 'FiUsers', color: 'bg-blue-500' },
  { id: 'timesheet', name: 'Timesheet', slug: 'timesheet', description: 'Configure timesheet entry form fields', icon: 'FiFileText', color: 'bg-green-500' }
]

const FormBuilder = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [formTypes, setFormTypes] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newFormType, setNewFormType] = useState({ name: '', slug: '', description: '', icon: 'FiGrid' })

  const iconMap = {
    FiUsers: FiUsers,
    FiFileText: FiFileText,
    FiGrid: FiGrid,
    FiSettings: FiSettings
  }

  const fetchFormTypes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axiosInstance.get('/api/form-config/types/list')
      const types = res.data.types || []
      const merged = [...DEFAULT_FORM_TYPES]
      types.forEach(t => {
        if (!merged.find(d => d.id === t.id)) {
          merged.push(t)
        }
      })
      setFormTypes(merged)
    } catch (error) {
      console.error('Error fetching form types:', error)
      setFormTypes(DEFAULT_FORM_TYPES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchFormTypes()
    }
  }, [token, fetchFormTypes])

  const handleAddFormType = async () => {
    if (!newFormType.name.trim() || !newFormType.slug.trim()) {
      toast.error('Name and slug are required')
      return
    }

    const slug = newFormType.slug.toLowerCase().replace(/\s+/g, '-')
    const newType = {
      id: slug,
      name: newFormType.name,
      slug: slug,
      description: newFormType.description || '',
      icon: newFormType.icon || 'FiGrid',
      color: 'bg-indigo-500'
    }

    try {
      await axiosInstance.post('/api/form-config/types', {
        name: newFormType.name,
        slug: slug,
        description: newFormType.description || ''
      })
      
      const updated = [...formTypes, newType]
      setFormTypes(updated)
      toast.success('Form type added successfully')
    } catch (error) {
      console.error('Error adding form type:', error)
      toast.error(error.response?.data?.message || 'Failed to add form type')
    }
    setShowAddModal(false)
    setNewFormType({ name: '', slug: '', description: '', icon: 'FiGrid' })
  }

  const handleDeleteFormType = async (id) => {
    if (id === 'employee' || id === 'timesheet') {
      toast.error('Cannot delete default form types')
      return
    }

    if (!window.confirm('Are you sure you want to delete this form type?')) {
      return
    }

    try {
      await axiosInstance.delete(`/api/form-config/types/${id}`)
      const updated = formTypes.filter(t => t.id !== id)
      setFormTypes(updated)
      toast.success('Form type deleted')
    } catch (error) {
      console.error('Error deleting form type:', error)
      toast.error(error.response?.data?.message || 'Failed to delete form type')
    }
  }

  const handleEditFormType = (formType) => {
    navigate(`/admin/form-builder/${formType.slug}`)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schema Configuration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage form schemas and field configurations for different modules
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Add New Form Type
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formTypes.map(formType => {
            const Icon = iconMap[formType.icon] || FiGrid
            return (
              <div
                key={formType.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEditFormType(formType)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${formType.color || 'bg-indigo-500'} rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {formType.id !== 'employee' && formType.id !== 'timesheet' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFormType(formType.id)
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {formType.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {formType.description || 'No description'}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditFormType(formType)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <FiSettings className="w-4 h-4" />
                    Configure Schema
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add New Form Type Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Add New Form Type
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Form Name *
                    </label>
                    <input
                      type="text"
                      value={newFormType.name}
                      onChange={(e) => setNewFormType({ ...newFormType, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g. Leave Request Form"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={newFormType.slug}
                      onChange={(e) => setNewFormType({ ...newFormType, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g. leave-request"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      URL-friendly identifier (lowercase, hyphens)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newFormType.description}
                      onChange={(e) => setNewFormType({ ...newFormType, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Brief description of this form type"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddFormType}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add Form Type
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setNewFormType({ name: '', slug: '', description: '', icon: 'FiGrid' })
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
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

export default FormBuilder
