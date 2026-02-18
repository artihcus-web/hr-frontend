import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, loading, token, activeRole } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    // Not authenticated
    if (!user || !token) {
        const redirect = encodeURIComponent(location.pathname + location.search)
        return <Navigate to={`/login?redirect=${redirect}`} replace />
    }

    // Determine effective role (project-specific role takes precedence)
    const currentRole = activeRole || user.role

    // Authenticated but not authorized for this route
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
        // Redirect to role-based dashboard
        const roleBasedDashboard = currentRole === 'admin' ? '/admin' : '/dashboard'
        console.warn(`Access denied. Role: ${currentRole}, Allowed: ${allowedRoles}, Redirecting to: ${roleBasedDashboard}`)
        return <Navigate to={roleBasedDashboard} replace />
    }

    return <Outlet />
}

export default ProtectedRoute
