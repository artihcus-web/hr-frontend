import { roleMapping, menuItems as allMenuItems } from '../config/menuConfig.jsx'
import axiosInstance from './axiosInstance'
import { 
  FiHome, FiUser, FiUserCheck, FiClock, FiCalendar, FiUsers, FiCheckCircle, 
  FiDollarSign, FiFileText, FiPlus, FiPieChart, FiSettings, FiBriefcase, 
  FiTrendingUp, FiFolder, FiAlertCircle, FiMonitor, FiVideo, FiClipboard 
} from 'react-icons/fi'

// Icon mapping: string name -> React component
const iconMap = {
  'FiHome': FiHome,
  'FiUser': FiUser,
  'FiUserCheck': FiUserCheck,
  'FiClock': FiClock,
  'FiCalendar': FiCalendar,
  'FiUsers': FiUsers,
  'FiCheckCircle': FiCheckCircle,
  'FiDollarSign': FiDollarSign,
  'FiFileText': FiFileText,
  'FiPlus': FiPlus,
  'FiPieChart': FiPieChart,
  'FiSettings': FiSettings,
  'FiBriefcase': FiBriefcase,
  'FiTrendingUp': FiTrendingUp,
  'FiFolder': FiFolder,
  'FiAlertCircle': FiAlertCircle,
  'FiMonitor': FiMonitor,
  'FiVideo': FiVideo,
  'FiClipboard': FiClipboard
}

// Cache for menu config to avoid repeated API calls (per role)
let menuConfigCache = null // { items: [...], role: 'admin' }
let menuConfigCacheTime = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Maps backend role to frontend role
 * @param {string} backendRole - Role from backend (admin, hr, manager, etc.)
 * @returns {string} Frontend role (super_admin, hr_admin, manager, etc.)
 */
export const mapBackendRoleToFrontend = (backendRole) => {
  return roleMapping[backendRole] || backendRole
}


/**
 * Fetches menu configuration from API
 * @param {string} userRole - User's backend role
 * @returns {Promise<Array>} Menu items array
 */
export const fetchMenuConfigFromAPI = async (backendRole) => {
  try {
    // Check cache (cache key should include role to avoid mixing roles)
    const now = Date.now()
    if (menuConfigCache && menuConfigCacheTime && menuConfigCache.role === backendRole && (now - menuConfigCacheTime) < CACHE_DURATION) {
      return menuConfigCache.items
    }

    // API expects backend role directly - add timeout to prevent blocking
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
    
    const res = await axiosInstance.get(`/api/admin/controllers/menu-config/${backendRole}`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    if (res.data.menuItems && res.data.menuItems.length > 0) {
      // Transform API response to match menuConfig.js format
      const transformed = res.data.menuItems.map(item => {
        // Find matching item from menuConfig.js to get icon component
        const originalItem = allMenuItems.find(mi => mi.id === item.id)
        const icon = originalItem?.icon || iconMap[item.icon] || FiFileText

        return {
          id: item.id,
          label: item.label,
          path: item.path,
          icon: icon,
          roles: item.roles.map(r => roleMapping[r] || r), // Convert to frontend roles
          exact: originalItem?.exact,
          parentId: item.parentId,
          hasChildren: item.hasChildren,
          menuOrder: item.menuOrder || 999, // API returns single number for the role
          isVisible: item.isVisible !== false // API returns boolean for the role
        }
      })

      // Cache the result (include role in cache)
      menuConfigCache = { items: transformed, role: backendRole }
      menuConfigCacheTime = now
      return transformed
    }
  } catch (error) {
    // Silently handle errors - we'll use hardcoded menu
    if (error.name === 'AbortError') {
      console.debug('Menu config API timeout, using hardcoded menu')
    } else if (error.response?.status === 404 || error.response?.status === 200) {
      console.debug('No menu config found in database, using hardcoded menuConfig.js')
    } else {
      console.debug('Failed to fetch menu config from API, using fallback:', error.message)
    }
  }
  
  return null // Return null to trigger fallback
}

/**
 * Filters menu items based on user role (synchronous version - uses hardcoded config)
 * @param {Array} menuItems - All menu items
 * @param {string} userRole - User's role (backend role format)
 * @returns {Array} Filtered menu items
 */
export const filterMenuByRoleSync = (menuItems, userRole) => {
  const frontendRole = mapBackendRoleToFrontend(userRole)
  
  const filtered = menuItems
    .filter(item => item.roles.includes(frontendRole))
    .map(item => {
      // If item has children, filter them too
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByRoleSync(item.children, userRole)
        // Only include parent if it has at least one visible child
        if (filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren
          }
        }
        // If no children match, still show parent if it has a direct path
        return item.path ? { ...item, children: [] } : null
      }
      return item
    })
    .filter(item => item !== null)

  // Deduplicate by label so "Policies" (and any same-name items) appear once.
  // Keep last occurrence so employee-facing link wins (e.g. /policies over /admin/policies for HR).
  const byLabel = new Map()
  filtered.forEach(item => {
    const key = (item.label || '').trim().toLowerCase()
    byLabel.set(key, item)
  })
  return filtered.filter(item => {
    const key = (item.label || '').trim().toLowerCase()
    return byLabel.get(key) === item
  })
}

/**
 * Filters menu items based on user role (with API support)
 * @param {Array} menuItems - All menu items (optional, will use API if not provided)
 * @param {string} userRole - User's role (backend role format)
 * @param {boolean} useAPI - Whether to fetch from API (default: true)
 * @returns {Promise<Array>} Filtered menu items
 */
export const filterMenuByRole = async (menuItems = null, userRole, useAPI = true) => {
  const frontendRole = mapBackendRoleToFrontend(userRole)
  
  let itemsToFilter = menuItems
  let itemsFromAPI = false

  // Try to fetch from API if enabled and no items provided
  // Pass backend role directly to API (it expects backend role)
  if (useAPI && !menuItems) {
    const apiItems = await fetchMenuConfigFromAPI(userRole) // Pass backend role, not frontend
    if (apiItems && apiItems.length > 0) {
      itemsToFilter = apiItems
      itemsFromAPI = true // Mark that items came from API (already filtered)
    } else {
      // Fallback to hardcoded menuConfig.js
      itemsToFilter = allMenuItems
      itemsFromAPI = false
    }
  } else if (!itemsToFilter) {
    itemsToFilter = allMenuItems
    itemsFromAPI = false
  }
  
  // Always filter by role AND visibility for safety (backend might have bugs)
  // API items have roles converted to frontend format, so we can filter by frontendRole
  const filtered = itemsToFilter
    .filter(item => {
      // Check role access (items from API have frontend roles after conversion)
      const hasRoleAccess = item.roles.includes(frontendRole)
      
      // Check visibility (only for API items)
      const isVisible = itemsFromAPI ? (item.isVisible !== false) : true
      
      const shouldShow = hasRoleAccess && isVisible
      return shouldShow
    })
    .map(item => {
      // If item has children, filter them too
      if (item.children && item.children.length > 0) {
        let filteredChildren
        if (itemsFromAPI) {
          // API items - children already filtered
          filteredChildren = itemsToFilter.filter(child => 
            child.parentId === item.id && child.isVisible !== false
          )
        } else {
          // Hardcoded items - filter by role
          filteredChildren = itemsToFilter.filter(child => 
            child.parentId === item.id && child.roles.includes(frontendRole)
          )
        }
        // Only include parent if it has at least one visible child
        if (filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren
          }
        }
        // If no children match, still show parent if it has a direct path
        return item.path ? { ...item, children: [] } : null
      }
      return item
    })
    .filter(item => item !== null)
    .sort((a, b) => {
      // Sort by menuOrder if available (from API)
      // API returns menuOrder as a number, not an object
      const orderA = typeof a.menuOrder === 'number' ? a.menuOrder : (a.menuOrder?.[userRole] ?? 999)
      const orderB = typeof b.menuOrder === 'number' ? b.menuOrder : (b.menuOrder?.[userRole] ?? 999)
      return orderA - orderB
    })

  // Deduplicate by label so "Policies" (and any same-name items) appear once.
  // Keep last occurrence so employee-facing link wins (e.g. /policies over /admin/policies for HR).
  const byLabel = new Map()
  filtered.forEach(item => {
    const key = (item.label || '').trim().toLowerCase()
    byLabel.set(key, item)
  })
  return filtered.filter(item => {
    const key = (item.label || '').trim().toLowerCase()
    return byLabel.get(key) === item
  })
}

/**
 * Checks if user has access to a route based on role
 * @param {string} routePath - Route path to check
 * @param {string} userRole - User's role
 * @param {Array} items - Menu items to check (defaults to all menuItems)
 * @returns {boolean} True if user has access
 */
export const hasRouteAccess = (routePath, userRole, items = allMenuItems) => {
  const frontendRole = mapBackendRoleToFrontend(userRole)
  
  // Recursive function to check menu items
  const checkMenuItem = (menuItems) => {
    for (const item of menuItems) {
      if (item.path === routePath && item.roles.includes(frontendRole)) {
        return true
      }
      if (item.children && checkMenuItem(item.children)) {
        return true
      }
    }
    return false
  }
  
  return checkMenuItem(items)
}

/**
 * Clears the menu config cache (useful after updates)
 */
export const clearMenuConfigCache = () => {
  menuConfigCache = null
  menuConfigCacheTime = null
  console.log('Menu config cache cleared')
}
