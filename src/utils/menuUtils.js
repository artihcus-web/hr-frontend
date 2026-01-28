import { roleMapping, menuItems as allMenuItems } from '../config/menuConfig.js'

/**
 * Maps backend role to frontend role
 * @param {string} backendRole - Role from backend (admin, hr, manager, etc.)
 * @returns {string} Frontend role (super_admin, hr_admin, manager, etc.)
 */
export const mapBackendRoleToFrontend = (backendRole) => {
  return roleMapping[backendRole] || backendRole
}

/**
 * Filters menu items based on user role
 * @param {Array} menuItems - All menu items
 * @param {string} userRole - User's role (backend role format)
 * @returns {Array} Filtered menu items
 */
export const filterMenuByRole = (menuItems, userRole) => {
  const frontendRole = mapBackendRoleToFrontend(userRole)
  
  return menuItems
    .filter(item => item.roles.includes(frontendRole))
    .map(item => {
      // If item has children, filter them too
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByRole(item.children, userRole)
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

