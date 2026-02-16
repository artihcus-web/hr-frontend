import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiPower, FiSun, FiMoon } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getProfileImageUrl } from '../../config/apiConfig'

function Header() {
  const navigate = useNavigate()

  const { user, logout } = useAuth()
  const [imageError, setImageError] = useState(false)

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

  const profileImageUrl = user?.profileImage ? getProfileImageUrl(user.profileImage) : null

  const { theme, toggleTheme } = useTheme()

  // Public routes: keep simple header or none (layout already hides header on login/signup)
  if (!user) {
    return null
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50 transition-colors border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: page title (Hidden/Removed) */}

          {/* Center: Spacer */}
          <div className="flex-1"></div>

          {/* Right: bell, user profile, power button */}
          <div className="flex items-center gap-3">
            {/* Bell / notifications */}


            {/* User name + avatar */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <div className="text-sm text-gray-800 dark:text-gray-200 font-medium max-w-[120px] truncate">
                  {displayName}
                </div>
                <Link
                  to="/my-info"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View my info
                </Link>
              </div>
              <Link
                to="/my-info"
                className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all select-none"
              >
                {profileImageUrl && !imageError ? (
                  <img
                    src={profileImageUrl}
                    alt="User profile"
                    className="w-full h-full object-cover rounded-full"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  avatarInitials
                )}
              </Link>
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
