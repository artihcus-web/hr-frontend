import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import axiosInstance from '../utils/axiosInstance'
import { filterMenuByRole, clearMenuConfigCache } from '../utils/menuUtils'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  // When token exists, do not hydrate user from localStorage so role/menu come from /me on every load.
  // This keeps incognito and normal login consistent (no stale role from cache).
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      console.log('[AuthContext] hydrate: no token')
      return null
    }
    // Rely on fetchUser() to set user from /api/auth/me so role is always fresh (fixes sidebar differing in incognito vs normal).
    return null
  })
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [menuConfig, setMenuConfig] = useState(null)
  const [menuConfigLoading, setMenuConfigLoading] = useState(false)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setMenuConfig(null)
    clearMenuConfigCache()
    // Force full page reload for every user (admin, employee, HR, etc.) so next login has no stale cache/state
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  // Fetch menu config for user role
  const fetchMenuConfig = useCallback(async (userRole) => {
    if (!userRole) return null
    
    setMenuConfigLoading(true)
    try {
      const filtered = await filterMenuByRole(null, userRole, true)
      setMenuConfig(filtered)
      return filtered
    } catch (error) {
      console.error('[AuthContext] Error fetching menu config:', error)
      return null
    } finally {
      setMenuConfigLoading(false)
    }
  }, [])

  // Fetch current user from API
  const fetchUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token')
    console.log('[AuthContext] fetchUser start, hasToken:', !!storedToken)

    if (!storedToken) {
      setUser(null)
      setMenuConfig(null)
      setLoading(false)
      return
    }

    try {
      // Fetch user first (needed to determine role for menu config)
      const userResponse = await axiosInstance.get('/api/auth/me')
      const userData = userResponse.data.user
      console.log('[AuthContext] fetchUser /me:', { hasUser: !!userData, profileImage: userData?.profileImage, _id: userData?._id })
      
      setUser(userData)
      setToken(storedToken)

      // Also update localStorage for backward compatibility
      localStorage.setItem('user', JSON.stringify(userData))

      // Fetch menu config BEFORE marking loading as complete
      // This ensures everything is loaded before UI renders (on page reload)
      const roleToUse = userData?.role
      if (roleToUse) {
        console.log('[AuthContext] Fetching menu config for role (on reload):', roleToUse)
        try {
          await fetchMenuConfig(roleToUse)
          console.log('[AuthContext] Menu config loaded successfully (on reload)')
        } catch (error) {
          console.warn('[AuthContext] Menu config fetch failed on reload, will use fallback:', error.message)
          // Continue anyway - sidebar will use fallback menu
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      // On network error or other error, try to use localStorage as fallback
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
          // Try to fetch menu config for cached user too
          if (parsedUser?.role) {
            try {
              await fetchMenuConfig(parsedUser.role)
            } catch {
              // Use fallback menu
            }
          }
        } catch {
          logout()
        }
      } else {
        logout()
      }
    } finally {
      setLoading(false)
    }
  }, [fetchMenuConfig])

  // Fetch user on mount and when token changes
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (newToken, userData) => {
    console.log('[AuthContext] login called:', { hasUser: !!userData, profileImage: userData?.profileImage, _id: userData?._id })
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    // Flush state so redirect/navigation sees the new user (avoids employee seeing admin dashboard after admin logout)
    flushSync(() => {
      setToken(newToken)
      setUser(userData)
    })
    
    // Fetch menu config BEFORE login completes - wait for it to finish
    // This ensures everything is loaded before navigation
    const roleToUse = userData?.role
    if (roleToUse) {
      console.log('[AuthContext] Fetching menu config during login for role:', roleToUse)
      try {
        await fetchMenuConfig(roleToUse)
        console.log('[AuthContext] Menu config loaded successfully')
      } catch (error) {
        console.warn('[AuthContext] Menu config fetch failed, will use fallback:', error.message)
        // Continue anyway - sidebar will use fallback menu
      }
    }
  }

  const refreshUser = () => {
    setLoading(true)
    fetchUser()
  }

  const [myProjects, setMyProjects] = useState([])
  const [activeProject, setActiveProject] = useState(() => {
    const saved = localStorage.getItem('activeProject')
    return saved ? JSON.parse(saved) : null
  })

  // Derived active role (checks if user is PM in active project)
  // Logic: 
  // 1. If admin, always admin (handled in filtered menu)
  // 2. If PM in active project -> 'manager'
  // 3. Else -> 'employee'
  const activeRole = React.useMemo(() => {
    if (!user) return null
    if (user.role === 'admin' || user.role === 'super_admin') return user.role

    if (activeProject) {
      // Check if user is in projectManagers list of active project
      // Safe ID comparison
      const isManager = activeProject.projectManagers?.some(pm => {
        const pmId = pm._id || pm.id || pm
        const userId = user._id || user.id
        return pmId?.toString() === userId?.toString()
      })
      return isManager ? 'manager' : 'employee'
    }

    return user.role // Fallback to default role
  }, [user, activeProject])

  // Fetch menu config when user changes (e.g., role change, project switch)
  // This is a backup in case fetchUser didn't trigger it, or for role changes
  useEffect(() => {
    if (user && !menuConfig && loading === false) {
      const roleToUse = activeRole || user.role
      if (roleToUse) {
        console.log('[AuthContext] Fetching menu config for role (backup):', roleToUse)
        fetchMenuConfig(roleToUse).catch(() => {})
      }
    }
  }, [user, activeRole, loading, menuConfig, fetchMenuConfig])

  // Fetch user's projects
  const fetchMyProjects = useCallback(async () => {
    if (!token) return
    try {
      const res = await axiosInstance.get('/api/projects/my-projects')
      const projects = res.data.projects || []
      setMyProjects(projects)

      // Auto-select first project if none selected AND none in localStorage
      if (projects.length > 0 && !activeProject) {
        const saved = localStorage.getItem('activeProject')
        if (saved) {
          setActiveProject(JSON.parse(saved))
        } else {
          setActiveProject(projects[0])
          localStorage.setItem('activeProject', JSON.stringify(projects[0]))
        }
      }
    } catch (error) {
      console.error("Failed to fetch my projects", error)
    }
  }, [token, activeProject])

  // Fetch projects when user is loaded
  useEffect(() => {
    if (user && token && user.role !== 'admin') {
      fetchMyProjects()
    }
  }, [user, token, fetchMyProjects])

  const switchProject = (projectId) => {
    const project = myProjects.find(p => p._id === projectId || p.id === projectId)
    if (project) {
      setActiveProject(project)
      localStorage.setItem('activeProject', JSON.stringify(project))
    }
  }

  // Combined loading state: true if user is loading OR menu config is loading (on reload)
  // During login, menu config is loaded before login() completes, so this won't block
  // On reload, we wait for both user and menu config before showing UI
  const isLoading = loading || (user && !menuConfig && menuConfigLoading)

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading: isLoading,
      menuConfig,
      menuConfigLoading,
      login,
      logout,
      refreshUser,
      myProjects,
      activeProject,
      activeRole,
      switchProject
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

