import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FiUsers, FiBriefcase } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import LoadingSpinner from '../../common/LoadingSpinner'
import Calendar from '../../common/Calendar'

function AdminDashboard() {
  const navigate = useNavigate()
  const { user, loading, token } = useAuth()
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
      return
    }
    if (user && user.role !== 'admin') {
      navigate('/')
    }
  }, [navigate, user, loading])

  // Fetch total users count
  useEffect(() => {
    const fetchTotalUsers = async () => {
      if (!token || !user || user.role !== 'admin') return

      try {
        setLoadingUsers(true)
        const res = await axiosInstance.get('/api/auth/users')
        const data = res.data

        const employees = data.users?.filter(user => user.role !== 'admin') || []
        setTotalUsers(employees.length)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }

    if (user && user.role === 'admin' && token) {
      fetchTotalUsers()
    }
  }, [user, token])

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-gray-950 py-6 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">

        {/* Main Grid: Left Column (Sidebar) + Right Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* LEFT COLUMN (Span 1) */}
          <div className="space-y-6">
            {/* 1. Total Employees */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Employees</span>
                <FiUsers className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loadingUsers ? (
                  <LoadingSpinner className="h-6 w-6" />
                ) : (
                  totalUsers
                )}
              </p>
            </div>

            {/* 2. Calendar (Month View) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                className="!border-0 !shadow-none w-full"
              />
            </div>
          </div>

          {/* RIGHT AREA (Span 3) */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Feature Cards Grid */}

              {/* User Management */}
              <Link
                to="/admin/users"
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200 group block h-full"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">User Management</span>
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-1.5 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                    <FiUsers className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Manage Access</span>
                  <span className="text-orange-500 text-sm">→</span>
                </div>
              </Link>

              {/* Projects */}
              <Link
                to="/admin/projects"
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200 group block h-full"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Project Resources</span>
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <FiBriefcase className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">View Active</span>
                  <span className="text-blue-500 text-sm">→</span>
                </div>
              </Link>


            </div>

            {/* Additional content could go here in future rows */}

          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
