import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import axiosInstance from '../../../utils/axiosInstance'
import toast from '../../../utils/toast'
import { FiUsers, FiMonitor, FiSettings, FiAlertCircle, FiFileText, FiSave, FiCheck, FiX } from 'react-icons/fi'
import LoadingSpinner from '../../common/LoadingSpinner'

const AdminControllers = () => {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [permissions, setPermissions] = useState({
    employeeDirectory: { roles: ['hr'], users: [] },
    ticketConfiguration: { roles: ['hr'], users: [] },
    schemaConfiguration: { roles: ['hr'], users: [] },
    grievancePortal: { roles: ['hr'], users: [] },
    policies: { roles: ['hr'], users: [] }
  })

  const features = [
    {
      id: 'employeeDirectory',
      label: 'Employee Directory',
      icon: FiUsers,
      description: 'Access to add, edit, and manage employees'
    },
    {
      id: 'ticketConfiguration',
      label: 'Ticket Configuration',
      icon: FiMonitor,
      description: 'Configure grievance ticket types and settings'
    },
    {
      id: 'schemaConfiguration',
      label: 'Schema Configuration',
      icon: FiSettings,
      description: 'Manage form schemas and configurations'
    },
    {
      id: 'grievancePortal',
      label: 'Grievance Portal',
      icon: FiAlertCircle,
      description: 'Access to grievance portal administration'
    },
    {
      id: 'policies',
      label: 'Policies',
      icon: FiFileText,
      description: 'Access to view and manage company policies'
    }
  ]

  const roles = ['admin', 'c-suite', 'hr', 'manager', 'supermanager', 'tl', 'employee', 'client']

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/auth/users')
      setEmployees(res.data.users || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/admin/controllers/permissions')
      setPermissions(prev => res.data.permissions || prev)
    } catch (error) {
      console.error('Error fetching permissions:', error)
      // Fallback to defaults if API fails
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchEmployees()
      fetchPermissions()
    }
  }, [token, fetchEmployees, fetchPermissions])

  const handleRoleToggle = (featureId, role) => {
    setPermissions(prev => {
      const feature = prev[featureId]
      const hasRole = feature.roles.includes(role)
      return {
        ...prev,
        [featureId]: {
          ...feature,
          roles: hasRole
            ? feature.roles.filter(r => r !== role)
            : [...feature.roles, role]
        }
      }
    })
  }

  const handleUserToggle = (featureId, userId) => {
    setPermissions(prev => {
      const feature = prev[featureId]
      const hasUser = feature.users.includes(userId)
      return {
        ...prev,
        [featureId]: {
          ...feature,
          users: hasUser
            ? feature.users.filter(id => id !== userId)
            : [...feature.users, userId]
        }
      }
    })
  }

  const handleSave = async () => {
    try {
      await axiosInstance.put('/api/admin/controllers/permissions', { permissions })
      toast.success('Permissions saved successfully')
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast.error(error.response?.data?.message || 'Failed to save permissions')
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Controllers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage access permissions for admin features. Grant access to specific roles or individual employees.
          </p>
        </div>

        <div className="space-y-6">
          {features.map(feature => {
            const FeatureIcon = feature.icon
            const featurePerms = permissions[feature.id]

            return (
              <div
                key={feature.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <FeatureIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {feature.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Role-based Access */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Access by Role
                    </h4>
                    <div className="space-y-2">
                      {roles.map(role => {
                        const hasAccess = featurePerms.roles.includes(role)
                        return (
                          <label
                            key={role}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={hasAccess}
                              onChange={() => handleRoleToggle(feature.id, role)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                              {role === 'c-suite' ? 'C-Suite' : role === 'tl' ? 'Team Lead' : role}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* User-based Access */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Access by Individual Employee
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {employees
                        .filter(emp => emp.role !== 'admin')
                        .map(emp => {
                          const hasAccess = featurePerms.users.includes(emp._id || emp.id)
                          return (
                            <label
                              key={emp._id || emp.id}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={() => handleUserToggle(feature.id, emp._id || emp.id)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email}
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  ({emp.role})
                                </span>
                              </span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            <FiSave className="w-4 h-4" />
            Save All Permissions
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminControllers
