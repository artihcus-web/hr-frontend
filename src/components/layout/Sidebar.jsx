import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { menuItems } from '../../config/menuConfig.js'
import { filterMenuByRole } from '../../utils/menuUtils.js'
import { FiChevronDown, FiChevronRight, FiChevronLeft, FiMenu, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../assets/artihcus-logo1.svg'

function Sidebar() {
  const location = useLocation()
  const { user, activeRole } = useAuth()
  const [filteredMenu, setFilteredMenu] = useState([])
  const [expandedItems, setExpandedItems] = useState({})
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Use activeRole if available (for project context), otherwise user.role
    const roleToUse = activeRole || user?.role

    if (user && roleToUse) {
      console.log('Filtering Menu for Role:', roleToUse)
      const filtered = filterMenuByRole(menuItems, roleToUse)
      setFilteredMenu(filtered)

      const currentPath = location.pathname
      const autoExpand = {}
      filtered.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.path === currentPath)
          if (hasActiveChild) {
            autoExpand[item.id] = true
          }
        }
      })
      setExpandedItems(autoExpand)
    }
  }, [location.pathname, user, activeRole])

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const renderMenuItem = (item) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems[item.id]
    const disabled = item.disabled
    const active = !disabled && isActive(item.path, item.exact)

    if (isCollapsed) {
      return (
        <div key={item.id} className="flex justify-center mb-1 relative group">
          {disabled ? (
            <div className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-300 cursor-not-allowed">
              <Icon className="h-5 w-5" />
            </div>
          ) : hasChildren ? (
            <button
              className={`
                w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200
                ${active
                  ? 'bg-indigo-600 text-white shadow-md dark:shadow-none'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white icon-hover transition-colors'
                }
              `}
            >
              <Icon className="h-5 w-5" />
            </button>
          ) : (
            <Link
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`
                w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200
                ${active
                  ? 'bg-indigo-600 text-white shadow-md dark:shadow-none'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white icon-hover transition-colors'
                }
              `}
            >
              <Icon className="h-5 w-5" />
            </Link>
          )}

          {/* Floating Submenu / Tooltip for Collapsed State */}
          <div className="absolute left-full top-0 ml-3 z-50 hidden group-hover:block transition-colors">
            {hasChildren ? (
              <div className="w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</span>
                </div>
                <div className="p-1.5 space-y-0.5">
                  {item.children.map(child => {
                    const childActive = isActive(child.path)
                    return (
                      <Link
                        key={child.id}
                        to={child.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={`
                          block px-3 py-2 text-sm rounded-lg transition-colors
                          ${childActive
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                          }
                        `}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 dark:bg-black text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                {item.label}
              </div>
            )}
          </div>
        </div>
      )
    }

    // Expanded state
    return (
      <div key={item.id} className="mb-0.5">
        <div
          className={`
            group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer mx-2
            ${disabled
              ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
              : active
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
            }
          `}
        >
          {hasChildren && !disabled ? (
            <button
              onClick={() => toggleExpand(item.id)}
              className="flex items-center flex-1 text-left w-full focus:outline-none"
            >
              <Icon className={`h-5 w-5 mr-3 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="flex-1">{item.label}</span>
              {isExpanded ? (
                <FiChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <FiChevronRight className="h-4 w-4 text-gray-400" />
              )}
              {item.badge && (
                <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm transition-colors">
                  {item.badge}
                </span>
              )}
            </button>
          ) : (
            <>
              {disabled ? (
                <div className="flex items-center flex-1 w-full">
                  <Icon className="h-5 w-5 mr-3 text-gray-300" />
                  <span className="flex-1">
                    {item.label}
                  </span>
                </div>
              ) : (
                <Link
                  to={item.path}
                  className="flex items-center flex-1 w-full focus:outline-none"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className={`h-5 w-5 mr-3 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm transition-colors">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Submenu */}
        {hasChildren && isExpanded && (
          <div className="ml-9 mr-2 mt-1 space-y-0.5 border-l border-gray-100 dark:border-gray-800 pl-2">
            {item.children.map(child => {
              const ChildIcon = child.icon
              const childActive = isActive(child.path)
              return (
                <Link
                  key={child.id}
                  to={child.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors
                    ${childActive
                      ? 'text-indigo-700 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current mr-2 opacity-40"></span>
                  <span>{child.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const publicRoutes = ['/', '/login', '/signup']
  if (publicRoutes.includes(location.pathname) || !user) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
      >
        {isMobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      <aside
        className={`
          fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40
          bg-white dark:bg-gray-900 border-r border-gray-100/80 dark:border-gray-800 shadow-[1px_0_20px_0_rgba(0,0,0,0.02)]
          transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-[240px]'}
        `}
      >
        <div className="h-full flex flex-col">
          <div className={`flex items-center ${isCollapsed ? 'justify-center relative h-16' : 'justify-between px-5 h-16'} border-b border-gray-50 dark:border-gray-800 transition-all duration-300`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'}`}>
              {/* Show smaller/contained logo when collapsed */}
              <img
                src={Logo}
                alt="Logo"
                className={`transition-all duration-300 ${isCollapsed ? 'h-8 w-8 object-cover object-left' : 'h-10 w-auto'}`}
              />
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`
                p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors
                ${isCollapsed ? 'absolute left-1/2 ml-5 z-20 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800' : 'ml-auto'}
              `}
            >
              {isCollapsed ? <FiChevronRight className="h-3 w-3" /> : <FiChevronLeft className="h-5 w-5" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 custom-scrollbar">
            {filteredMenu.map(renderMenuItem)}
          </nav>

          <div className={`p-4 border-t border-gray-50 dark:border-gray-800 ${isCollapsed ? 'text-center' : ''}`}>
            <div className={`text-xs text-gray-400 font-medium ${isCollapsed ? 'hidden' : 'block'}`}>
              v1.0.0
            </div>
          </div>
        </div>

        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </aside>
    </>
  )
}

export default Sidebar

