import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FiUsers, FiBriefcase, FiTrendingUp, FiAlertCircle } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import LoadingSpinner from '../../common/LoadingSpinner'
import Calendar from '../../common/Calendar'
import RecentActivity from '../../dashboard/admin/RecentActivity'

function AdminDashboard() {
  const navigate = useNavigate()
  const { user, loading, token } = useAuth()
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

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

  // Fetch Stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!token || !user || user.role !== 'admin') return
      try {
        const res = await axiosInstance.get('/api/grievance/admin/stats')
        setStats(res.data.stats)
      } catch (error) {
        console.error('Failed to fetch ticket stats', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (user && user.role === 'admin' && token) {
      fetchStats()
    }
  }, [user, token])

  const renderGraph = () => {
    if (loadingStats) {
      return (
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[200px]">
          <LoadingSpinner />
        </div>
      )
    }

    if (!stats || !stats.trend || stats.trend.length === 0) {
      return (
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[200px] text-slate-400">
          <FiAlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      )
    }

    // Chart Dimensions
    const height = 210 // Increased height to balance with Activity Card
    const width = 500
    const paddingX = 30
    const paddingY = 20 // Reduced bottom padding

    // Scale Data
    const maxVal = Math.max(...stats.trend.map(d => d.count), 5) // Min cap 5 for scale
    const points = stats.trend.map((d, i) => {
      // X Axis = Days (Left to Right)
      const x = (i / (stats.trend.length - 1)) * (width - paddingX * 2) + paddingX
      // Y Axis = Count (Bottom to Top)
      const y = height - paddingY - (d.count / maxVal) * (height - paddingY * 2)
      return { x, y, val: d.count, label: d.day }
    })

    // Generate Path (Standard Curve)
    const pathData = points.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`
      const prev = a[i - 1]
      // Curve Logic: Control points midway horizontally (X)
      const midX = (prev.x + point.x) / 2
      return `${acc} C ${midX},${prev.y} ${midX},${point.y} ${point.x},${point.y}`
    }, '')

    return (
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full transition-colors flex flex-col">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 p-5 pb-0">
          <FiTrendingUp className="text-indigo-500" />
          Ticket Trends
        </h3>

        <div className="relative w-full min-h-[210px] p-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid Lines (Horizontal for Y-axis Counts) */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = height - paddingY - tick * (height - paddingY * 2)
              return (
                <g key={tick}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-slate-700" />
                  <text x={paddingX - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400">
                    {Math.round(tick * maxVal)}
                  </text>
                </g>
              )
            })}

            {/* The Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
              className="drop-shadow-sm"
            />

            {/* Data Points */}
            {points.map((point, i) => (
              <g key={i} className="group cursor-pointer">
                {/* Vertical Guide Line on Hover */}
                <line x1={point.x} y1={height - paddingY} x2={point.x} y2={point.y} stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" className="opacity-0 group-hover:opacity-50 transition-opacity" />

                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="white"
                  stroke="#6366f1"
                  strokeWidth="2"
                  className="transition-all duration-300 group-hover:r-6 dark:fill-slate-800"
                />

                {/* X Axis Labels (Days) */}
                <text x={point.x} y={height - 10} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">
                  {point.label}
                </text>

                {/* Tooltip */}
                <foreignObject x={point.x - 20} y={point.y - 35} width="40" height="30" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 text-center shadow-lg">
                    {point.val}
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>
        </div>
      </div>
    )
  }

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

        {/* Main Grid: 2 Columns - Left Area (Span 9) + Right Sidebar (Span 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT MAIN AREA (Span 9) */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-6 h-full">

            {/* LEFT COLUMN (Span 6 of 12) - Metrics */}
            <div className="md:col-span-6 flex flex-col gap-6">
              {/* Total Employees Widget */}
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

              {/* Dynamic Graph */}
              <div className="flex-1">
                {renderGraph()}
              </div>
            </div>

            {/* RIGHT COLUMN (Span 6 of 12) - Actions & Activity */}
            <div className="md:col-span-6 flex flex-col gap-6">
              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* User Management */}
                <Link
                  to="/admin/users"
                  className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900/50 transition-all duration-300 group block relative overflow-hidden"
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
                  className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 group block relative overflow-hidden"
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

              {/* Recent Activity (Now in Right Col, under Feature Cards) */}
              <div className="flex-1">
                <RecentActivity />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR (Span 3) - Calendar */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                className="!border-0 !shadow-none w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
