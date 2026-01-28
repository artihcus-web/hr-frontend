import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiFolder, FiHash, FiUsers, FiUserCheck, FiBriefcase } from 'react-icons/fi'

function UserProjects() {
  const navigate = useNavigate()
  const { user, token, loading } = useAuth()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
      return
    }
  }, [navigate, user, loading])

  // Fetch user's projects
  const fetchProjects = useCallback(async () => {
    if (!token) return

    try {
      setLoadingProjects(true)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/my-projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (res.ok) {
        setProjects(data.projects || [])
      } else {
        setError(data.message || 'Failed to fetch projects')
      }
    } catch {
      setError('Network error while fetching projects')
    } finally {
      setLoadingProjects(false)
    }
  }, [token])

  useEffect(() => {
    if (user && token) {
      fetchProjects()
    }
  }, [user, token, fetchProjects])

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'inactive':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      case 'completed':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'on-hold':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }
  }

  const getUserRoleInProject = (project) => {
    const userId = user?.id || user?._id
    const isManager = project.projectManagers?.some(
      mgr => (mgr._id || mgr.id) === userId
    )
    const isEmployee = project.employees?.some(
      emp => (emp._id || emp.id) === userId
    )

    if (isManager) return 'Project Manager'
    if (isEmployee) return 'Employee'
    return 'Member'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Projects</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Projects you are assigned to</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Projects Grid */}
        {loadingProjects ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-800 transition-colors">
            <FiBriefcase className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">No projects found.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">You haven't been assigned to any projects yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project._id || project.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <div className="p-6">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {project.projectName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <FiHash className="w-4 h-4" />
                        <span className="font-mono">{project.projectId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        <FiBriefcase className="w-3 h-3" />
                        <span>{getUserRoleInProject(project)}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Project Stats */}
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <div className="flex items-center gap-1">
                      <FiUsers className="w-4 h-4" />
                      <span>{project.employees?.length || 0} Employees</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiUserCheck className="w-4 h-4" />
                      <span>{project.projectManagers?.length || 0} Managers</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProjects

