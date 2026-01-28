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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome to Admin Dashboard!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            Overview of your organization's resources and projects.
          </p>
        </div>

        {/* Main Grid: Left Column (Sidebar) + Right Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* LEFT COLUMN (Span 1) */}
          <div className="space-y-6">
            {/* 1. Total Employees */}
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Employees</span>
                <FiUsers className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {loadingUsers ? (
                  <LoadingSpinner className="h-6 w-6" />
                ) : (
                  totalUsers
                )}
              </p>
            </div>

            {/* 2. Calendar (Month View) */}
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
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
                className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900/50 transition-all duration-300 group block h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500"></div>
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">User Management</span>
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-1.5 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                    <FiUsers className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 relative z-10">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Manage Access</span>
                  <span className="text-orange-500 text-sm">→</span>
                </div>
              </Link>

              {/* Projects */}
              <Link
                to="/admin/projects"
                className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 group block h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500"></div>
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Project Resources</span>
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <FiBriefcase className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 relative z-10">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">View Active</span>
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
