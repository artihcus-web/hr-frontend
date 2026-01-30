import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axiosInstance from '../utils/axiosInstance'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  // Fetch current user from API
  const fetchUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token')

    if (!storedToken) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      // Use axiosInstance - base URL and headers are already configured
      // Token is automatically attached by the interceptor
      const response = await axiosInstance.get('/api/auth/me')

      const userData = response.data.user
      setUser(userData)
      setToken(storedToken)

      // Also update localStorage for backward compatibility
      localStorage.setItem('user', JSON.stringify(userData))
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

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
  }

  const refreshUser = () => {
    setLoading(true)
    fetchUser()
  }

  const [myProjects, setMyProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)

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
      // Note: Project model populates projectManagers, so we check _id
      const isManager = activeProject.projectManagers?.some(
        pm => (pm._id === user._id || pm === user._id || pm.id === user.id)
      )
      return isManager ? 'manager' : 'employee'
    }

    return user.role // Fallback to default role
  }, [user, activeProject])

  // Fetch user's projects
  const fetchMyProjects = useCallback(async () => {
    if (!token) return
    try {
      const res = await axiosInstance.get('/api/projects/my-projects')
      const projects = res.data.projects || []
      setMyProjects(projects)

      // Auto-select first project if none selected
      if (projects.length > 0 && !activeProject) {
        // Prefer "Ready-to-deploy resources" if user is HR/Manager logic? 
        // No, just pick the first one for now or restore from localStorage if implemented later.
        setActiveProject(projects[0])
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
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
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

