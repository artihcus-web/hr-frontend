import React, { useState } from 'react'
import { getProfileImageUrl } from '../../config/apiConfig'

/**
 * Reusable Avatar component that shows profile image if available, otherwise shows initials
 * @param {Object} user - User object with profileImage, fullName, firstName, lastName, etc.
 * @param {string} size - Size class (e.g., 'w-10 h-10', 'w-8 h-8')
 * @param {string} bgColor - Background color class for initials fallback (e.g., 'bg-indigo-500')
 * @param {string} textSize - Text size class for initials (e.g., 'text-sm', 'text-xs')
 * @param {string} borderClass - Border classes (e.g., 'border-2 border-white')
 * @param {Function} getInitials - Optional function to generate initials, defaults to first 2 letters of name
 */
function Avatar({ 
  user, 
  size = 'w-10 h-10', 
  bgColor = 'bg-indigo-500', 
  textSize = 'text-sm',
  borderClass = '',
  getInitials: customGetInitials,
  className = ''
}) {
  const [imageError, setImageError] = useState(false)

  // Generate initials
  const getInitials = (userData) => {
    if (customGetInitials) return customGetInitials(userData)
    
    const name = userData?.fullName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.username || userData?.email || 'U'
    const parts = name.split(' ').filter(p => p)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const profileImageUrl = user?.profileImage ? getProfileImageUrl(user.profileImage) : null
  const initials = getInitials(user)

  return (
    <div className={`${size} ${bgColor} text-white flex items-center justify-center ${textSize} font-semibold overflow-hidden rounded-full ${borderClass} ${className}`}>
      {profileImageUrl && !imageError ? (
        <img
          src={profileImageUrl}
          alt={user?.fullName || user?.username || 'User'}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImageError(true)}
        />
      ) : (
        initials
      )}
    </div>
  )
}

export default Avatar
