import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiSearch, FiPower, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

function Header() {
  const navigate = useNavigate()

  const { user, logout, activeProject, myProjects, switchProject } = useAuth()
  const [showProfileCard, setShowProfileCard] = useState(false)
  const profileCardRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }



  const displayName = user?.fullName || user?.username || 'User'
  const avatarInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  // Close profile card when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileCardRef.current && !profileCardRef.current.contains(event.target)) {
        setShowProfileCard(false)
      }
    }

    if (showProfileCard) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileCard])

  const { theme, toggleTheme } = useTheme()

  // Public routes: keep simple header or none (layout already hides header on login/signup)
  if (!user) {
    return null
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50 transition-colors border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: page title (Hidden as per request) */}
          <div className="flex items-center">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              {/* No title displayed */}
            </h1>
          </div>

          {/* Center: Project Switcher */}
          <div className="flex-1 flex justify-center">
            {user?.role !== 'admin' && myProjects.length > 0 && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {activeProject?.projectName?.[0] || 'P'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none mb-0.5">Current Project</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none truncate max-w-[150px]">
                      {activeProject?.projectName || 'Select Project'}
                    </p>
                  </div>
                  <FiChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors ml-2" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-2 hidden group-hover:block animate-fade-in z-50">
                  <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700 mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Switch Project</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                    {myProjects.map(project => (
                      <button
                        key={project._id || project.id}
                        onClick={() => switchProject(project._id || project.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
                          ${(activeProject?._id === project._id || activeProject?.id === project.id)
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }
                        `}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                          ${(activeProject?._id === project._id || activeProject?.id === project.id)
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          }
                        `}>
                          {project.projectName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{project.projectName}</p>
                          <p className="text-[10px] opacity-70 truncate uppercase tracking-wider">
                            {project.projectId}
                          </p>
                        </div>
                        {(activeProject?._id === project._id || activeProject?.id === project.id) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-auto"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: bell, user profile, power button */}
          <div className="flex items-center gap-3">
            {/* Bell / notifications */}


            {/* User name + avatar */}
            <div ref={profileCardRef} className="relative flex items-center gap-2">
              <div className="hidden sm:block text-sm text-gray-800 dark:text-gray-200 font-medium max-w-[120px] truncate text-right">
                {displayName}
              </div>
              <div
                onClick={() => setShowProfileCard(!showProfileCard)}
                className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all select-none"
              >
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="User profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  avatarInitials
                )}
              </div>

              {/* Profile Popover Card */}
              {showProfileCard && (
                <div className="absolute top-12 right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-5 z-50 animate-scale-in origin-top-right">
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-50 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                      {avatarInitials}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate" title={displayName}>{displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.replace('_', ' ') || 'Employee'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg group hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <p className="text-[10px] text-gray-400 group-hover:text-indigo-400 dark:group-hover:text-indigo-300 uppercase font-bold tracking-wider mb-0.5">Emp ID</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-200">{user?.employeeId || user?._id?.substring(0, 6).toUpperCase() || 'EMP-001'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg group hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <p className="text-[10px] text-gray-400 group-hover:text-indigo-400 dark:group-hover:text-indigo-300 uppercase font-bold tracking-wider mb-0.5">Emp Name</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-200">{displayName}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg group hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <p className="text-[10px] text-gray-400 group-hover:text-indigo-400 dark:group-hover:text-indigo-300 uppercase font-bold tracking-wider mb-0.5">Emp Mail ID</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-200 break-all">{user?.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <FiMoon className="w-4 h-4 text-gray-600" />
              ) : (
                <FiSun className="w-4 h-4 text-yellow-400" />
              )}
            </button>

            {/* Power / logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 cursor-pointer transition-colors"
              title="Logout"
            >
              <FiPower className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Header
