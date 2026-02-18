import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import axiosInstance from '../../../utils/axiosInstance'
import toast from '../../../utils/toast'
import { FiUsers, FiMonitor, FiSettings, FiAlertCircle, FiFileText, FiSave, FiMenu, FiChevronUp, FiChevronDown, FiMove } from 'react-icons/fi'
import LoadingSpinner from '../../common/LoadingSpinner'
import { menuItems as allMenuItems, roleMapping } from '../../../config/menuConfig.js'

const AdminControllers = () => {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('menu') // 'menu' or 'features'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState([])
  
  // Menu Configuration state
  const [selectedRole, setSelectedRole] = useState('admin')
  const [menuConfig, setMenuConfig] = useState([])
  
  // Feature Permissions state (existing)
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
    }
  }, [])

  const fetchMenuConfig = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/admin/controllers/menu-config')
      if (res.data.menuItems && res.data.menuItems.length > 0) {
        setMenuConfig(res.data.menuItems)
      } else {
        // Initialize from menuConfig.js if no DB config exists
        const initialConfig = allMenuItems.map((item, index) => {
          // Get icon name from component (if it's a React component)
          let iconName = ''
          if (item.icon) {
            if (typeof item.icon === 'function') {
              iconName = item.icon.name || item.icon.displayName || ''
            } else if (typeof item.icon === 'string') {
              iconName = item.icon
            }
          }
          
          return {
            id: item.id,
            label: item.label,
            path: item.path,
            icon: iconName,
            roles: item.roles.map(r => {
              // Map frontend roles back to backend roles
              const backendRole = Object.entries(roleMapping).find(([_, frontend]) => frontend === r)?.[0]
              return backendRole || r
            }),
            users: [],
            isVisible: {},
            menuOrder: {},
            parentId: item.parentId || null,
            hasChildren: item.children ? true : false
          }
        })
        setMenuConfig(initialConfig)
      }
    } catch (error) {
      console.error('Error fetching menu config:', error)
      // Fallback to menuConfig.js
      const initialConfig = allMenuItems.map((item, index) => ({
        id: item.id,
        label: item.label,
        path: item.path,
        icon: item.icon?.name || '',
        roles: item.roles || [],
        users: [],
        isVisible: {},
        menuOrder: {},
        parentId: item.parentId || null,
        hasChildren: item.children ? true : false
      }))
      setMenuConfig(initialConfig)
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
      Promise.all([fetchEmployees(), fetchMenuConfig(), fetchPermissions()]).finally(() => {
        setLoading(false)
      })
    }
  }, [token, fetchEmployees, fetchMenuConfig, fetchPermissions])

  // Menu Configuration handlers
  const handleMenuRoleToggle = (menuItemId, role) => {
    setMenuConfig(prev => prev.map(item => {
      if (item.id === menuItemId) {
        const hasRole = item.roles.includes(role)
        return {
          ...item,
          roles: hasRole
            ? item.roles.filter(r => r !== role)
            : [...item.roles, role]
        }
      }
      return item
    }))
  }

  const handleMenuVisibilityToggle = (menuItemId, role) => {
    setMenuConfig(prev => prev.map(item => {
      if (item.id === menuItemId) {
        const currentVisible = item.isVisible?.[role] ?? true
        return {
          ...item,
          isVisible: {
            ...item.isVisible,
            [role]: !currentVisible
          }
        }
      }
      return item
    }))
  }

  const handleMenuOrderChange = (menuItemId, role, newOrder) => {
    setMenuConfig(prev => prev.map(item => {
      if (item.id === menuItemId) {
        return {
          ...item,
          menuOrder: {
            ...item.menuOrder,
            [role]: parseInt(newOrder) || 999
          }
        }
      }
      return item
    }))
  }

  const handleMenuUserToggle = (menuItemId, userId) => {
    setMenuConfig(prev => prev.map(item => {
      if (item.id === menuItemId) {
        const hasUser = item.users.includes(userId)
        return {
          ...item,
          users: hasUser
            ? item.users.filter(id => id !== userId)
            : [...item.users, userId]
        }
      }
      return item
    }))
  }

  const moveMenuItem = (index, direction) => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === menuConfig.length - 1)) {
      return
    }

    setMenuConfig(prev => {
      const newConfig = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      const currentOrder = newConfig[index].menuOrder?.[selectedRole] ?? 999
      const targetOrder = newConfig[targetIndex].menuOrder?.[selectedRole] ?? 999

      newConfig[index].menuOrder = {
        ...newConfig[index].menuOrder,
        [selectedRole]: targetOrder
      }
      newConfig[targetIndex].menuOrder = {
        ...newConfig[targetIndex].menuOrder,
        [selectedRole]: currentOrder
      }

      return newConfig
    })
  }

  const handleSaveMenuConfig = async () => {
    setSaving(true)
    try {
      await axiosInstance.put('/api/admin/controllers/menu-config', { menuItems: menuConfig })
      toast.success('Menu configuration saved successfully')
    } catch (error) {
      console.error('Error saving menu config:', error)
      toast.error(error.response?.data?.message || 'Failed to save menu configuration')
    } finally {
      setSaving(false)
    }
  }

  // Feature Permissions handlers (existing)
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

  const handleSavePermissions = async () => {
    setSaving(true)
    try {
      await axiosInstance.put('/api/admin/controllers/permissions', { permissions })
      toast.success('Permissions saved successfully')
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast.error(error.response?.data?.message || 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  // Get filtered menu items for preview (selected role)
  const previewMenuItems = menuConfig
    .filter(item => {
      const hasRoleAccess = item.roles.includes(selectedRole)
      const isVisible = item.isVisible?.[selectedRole] !== false
      return hasRoleAccess && isVisible
    })
    .sort((a, b) => {
      const orderA = a.menuOrder?.[selectedRole] ?? 999
      const orderB = b.menuOrder?.[selectedRole] ?? 999
      return orderA - orderB
    })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Controllers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage sidebar menu access, ordering, and feature permissions for different roles.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'menu'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FiMenu className="inline w-4 h-4 mr-2" />
              Menu Configuration
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'features'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FiSettings className="inline w-4 h-4 mr-2" />
              Feature Permissions
            </button>
          </div>
        </div>

        {/* Menu Configuration Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Role Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Configure Menu For Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role === 'c-suite' ? 'C-Suite' : role === 'tl' ? 'Team Lead' : role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Menu Items List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Menu Items Configuration
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Configure visibility, order, and access for each menu item
                </p>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {menuConfig.map((item, index) => {
                  const hasRoleAccess = item.roles.includes(selectedRole)
                  const isVisible = item.isVisible?.[selectedRole] !== false
                  const order = item.menuOrder?.[selectedRole] ?? 999

                  return (
                    <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.label}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({item.path})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            {/* Roles Access */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Roles with Access
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {roles.map(role => (
                                  <label
                                    key={role}
                                    className="flex items-center gap-1 text-xs cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.roles.includes(role)}
                                      onChange={() => handleMenuRoleToggle(item.id, role)}
                                      className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                                      {role === 'c-suite' ? 'C-Suite' : role === 'tl' ? 'TL' : role}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Visibility Toggle */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Visibility for {selectedRole}
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={() => handleMenuVisibilityToggle(item.id, selectedRole)}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                  {isVisible ? 'Visible' : 'Hidden'}
                                </span>
                              </label>
                            </div>

                            {/* Order */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Order (for {selectedRole})
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => moveMenuItem(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <FiChevronUp className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  value={order}
                                  onChange={(e) => handleMenuOrderChange(item.id, selectedRole, e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  min="0"
                                />
                                <button
                                  type="button"
                                  onClick={() => moveMenuItem(index, 'down')}
                                  disabled={index === menuConfig.length - 1}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <FiChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Preview: Menu for {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
              </h3>
              <div className="space-y-1">
                {previewMenuItems.length > 0 ? (
                  previewMenuItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-700 dark:text-gray-300"
                    >
                      {idx + 1}. {item.label} ({item.path})
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No menu items visible for this role</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveMenuConfig}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Menu Configuration'}
              </button>
            </div>
          </div>
        )}

        {/* Feature Permissions Tab */}
        {activeTab === 'features' && (
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

            <div className="flex justify-end">
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save All Permissions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminControllers
