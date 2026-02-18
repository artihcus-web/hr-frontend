import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
    // Clear any redirect parameters from URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('redirect')
      window.history.replaceState({}, '', url.toString())
    }
    setToken(null)
    setUser(null)
    setMenuConfig(null)
    clearMenuConfigCache()
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
      // Fetch user and menu config in parallel during initial load
      const [userResponse] = await Promise.all([
        axiosInstance.get('/api/auth/me'),
        // Menu config will be fetched after user is set (in useEffect)
      ])

      const userData = userResponse.data.user
      console.log('[AuthContext] fetchUser /me:', { hasUser: !!userData, profileImage: userData?.profileImage, _id: userData?._id })
      setUser(userData)
      setToken(storedToken)

      // Also update localStorage for backward compatibility
      localStorage.setItem('user', JSON.stringify(userData))

      // Fetch menu config after user is set (will happen in useEffect)
    } catch (error) {
      console.error('Error fetching user:', error)
      // On network error or other error, try to use localStorage as fallback
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          logout()
        }
      } else {
        logout()
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch user on mount and when token changes
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (newToken, userData) => {
    console.log('[AuthContext] login called:', { hasUser: !!userData, profileImage: userData?.profileImage, _id: userData?._id })
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
    
    // Fetch menu config immediately after login
    const roleToUse = userData?.role
    if (roleToUse) {
      console.log('[AuthContext] Fetching menu config during login for role:', roleToUse)
      await fetchMenuConfig(roleToUse)
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

  // Fetch menu config when user is loaded (during initial load/login)
  // Must be after activeRole is defined
  useEffect(() => {
    if (user && !menuConfig && loading === false) {
      const roleToUse = activeRole || user.role
      if (roleToUse) {
        console.log('[AuthContext] Fetching menu config for role:', roleToUse)
        fetchMenuConfig(roleToUse)
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

  // Combined loading state: true if user OR menu config is still loading
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

