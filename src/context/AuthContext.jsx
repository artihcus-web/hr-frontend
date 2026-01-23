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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
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

