import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import axiosInstance from '../../../utils/axiosInstance'
import toast from '../../../utils/toast'
import { FiSave, FiMove } from 'react-icons/fi'
import LoadingSpinner from '../../common/LoadingSpinner'
import { menuItems as allMenuItems, roleMapping } from '../../../config/menuConfig.jsx'

const AdminControllers = () => {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState('admin')
  const [menuConfig, setMenuConfig] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState(null)

  const roles = ['admin', 'c-suite', 'hr', 'manager', 'supermanager', 'tl', 'employee', 'client']

  const fetchMenuConfig = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/admin/controllers/menu-config')
      if (res.data.menuItems && res.data.menuItems.length > 0) {
        setMenuConfig(res.data.menuItems)
      } else {
        // Initialize from menuConfig.js if no DB config exists
        const initialConfig = allMenuItems.map((item) => {
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
              const backendRole = Object.entries(roleMapping).find(([, frontend]) => frontend === r)?.[0]
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
      const initialConfig = allMenuItems.map((item) => ({
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

  useEffect(() => {
    if (token) {
      fetchMenuConfig().finally(() => setLoading(false))
    }
  }, [token, fetchMenuConfig])

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

  // eslint-disable-next-line no-unused-vars
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

  // This function is no longer needed with drag-and-drop, but keeping for backward compatibility
  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
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

  const handleDragStart = (e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
    e.target.style.opacity = '0.5'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOverIndex(index)
  }

  const handleDragLeave = () => {
    setDraggedOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null)
      setDraggedOverIndex(null)
      return
    }
    setMenuConfig(prev => {
      const withAcc = prev.filter(item => item.roles.includes(selectedRole))
      const withoutAcc = prev.filter(item => !item.roles.includes(selectedRole))
      const sortedWith = [...withAcc].sort((a, b) => (a.menuOrder?.[selectedRole] ?? 999) - (b.menuOrder?.[selectedRole] ?? 999))
      const sortedWithout = [...withoutAcc].sort((a, b) => (a.menuOrder?.[selectedRole] ?? 999) - (b.menuOrder?.[selectedRole] ?? 999))
      const sorted = [...sortedWith, ...sortedWithout]
      const hasCount = sortedWith.length
      if (draggedItem >= hasCount || dropIndex >= hasCount) return prev
      const draggedItemData = sorted[draggedItem]
      sorted.splice(draggedItem, 1)
      sorted.splice(dropIndex, 0, draggedItemData)
      const updatedConfig = sorted.map((item, idx) => ({
        ...item,
        menuOrder: { ...item.menuOrder, [selectedRole]: idx + 1 }
      }))
      return prev.map(item => updatedConfig.find(u => u.id === item.id) || item)
    })
    setDraggedItem(null)
    setDraggedOverIndex(null)
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedItem(null)
    setDraggedOverIndex(null)
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

  if (loading) {
    return <LoadingSpinner />
  }

  // Sort: items this role HAS (by current sidebar order) first, then items this role DOESN'T have
  const withAccess = menuConfig.filter(item => item.roles.includes(selectedRole))
  const withoutAccess = menuConfig.filter(item => !item.roles.includes(selectedRole))
  const sortedWithAccess = [...withAccess].sort((a, b) => {
    const orderA = a.menuOrder?.[selectedRole] ?? 999
    const orderB = b.menuOrder?.[selectedRole] ?? 999
    return orderA - orderB
  })
  const sortedWithoutAccess = [...withoutAccess].sort((a, b) => {
    const orderA = a.menuOrder?.[selectedRole] ?? 999
    const orderB = b.menuOrder?.[selectedRole] ?? 999
    return orderA - orderB
  })
  const sortedMenuConfig = [...sortedWithAccess, ...sortedWithoutAccess]
  const hasAccessCount = sortedWithAccess.length

  // Preview: only items this role has access to (by order) — no separate visibility
  const previewMenuItems = sortedWithAccess.map((item, idx) => ({
    ...item,
    displayOrder: item.menuOrder?.[selectedRole] ?? idx + 1
  }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Controllers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage sidebar menu access and ordering for each role.
          </p>
        </div>

        <div className="space-y-4">
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

            {/* Left: List | Right: Preview — side by side, columns don't stretch */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              {/* Menu Items List — takes 2 cols; height follows content, scroll when many items */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Menu Items Configuration
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    First: items this role has (drag to reorder). Then: items without access. Use &quot;Roles with Access&quot; to grant/revoke.
                  </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto max-h-[60vh]">
                  {sortedMenuConfig.map((item, index) => {
                    const hasRoleAccess = item.roles.includes(selectedRole)
                    const order = item.menuOrder?.[selectedRole] ?? index + 1
                    const isDragging = draggedItem === index
                    const isDragOver = draggedOverIndex === index
                    const canDrag = index < hasAccessCount

                    return (
                      <div
                        key={item.id}
                        draggable={canDrag}
                        onDragStart={canDrag ? (e) => handleDragStart(e, index) : undefined}
                        onDragOver={canDrag ? (e) => handleDragOver(e, index) : undefined}
                        onDragLeave={handleDragLeave}
                        onDrop={canDrag ? (e) => handleDrop(e, index) : undefined}
                        onDragEnd={handleDragEnd}
                        className={`
                          p-4 transition-all duration-200
                          ${canDrag ? 'cursor-move' : 'cursor-default'}
                          ${isDragging ? 'opacity-50 bg-gray-100 dark:bg-gray-700' : ''}
                          ${isDragOver ? 'border-t-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : ''}
                          ${!isDragging && !isDragOver ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                          ${!hasRoleAccess ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                            {canDrag ? (
                              <FiMove className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            ) : (
                              <span className="w-5 h-5 block" />
                            )}
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6 text-center">
                              {hasRoleAccess ? order : '—'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {item.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                ({item.path})
                              </span>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Roles with Access
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {roles.map(role => (
                                  <label
                                    key={role}
                                    className="flex items-center gap-1 text-xs cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
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
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Preview — right side */}
              <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex flex-col min-h-0 sticky top-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Preview: {selectedRole === 'c-suite' ? 'C-Suite' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Sidebar for this role. Drag items above to reorder.
                </p>
                <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
                  {previewMenuItems.length > 0 ? (
                    previewMenuItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 w-5 flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No menu items for this role. Enable via Roles with Access.</p>
                  )}
                </div>
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
      </div>
    </div>
  )
}

export default AdminControllers
