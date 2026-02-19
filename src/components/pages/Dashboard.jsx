import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import axiosInstance from '../../utils/axiosInstance'
import { Link } from 'react-router-dom'
import { FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiInbox, FiUsers, FiFolder, FiExternalLink, FiSearch, FiFilter, FiCalendar, FiPlus, FiChevronDown } from 'react-icons/fi'
import Calendar from '../common/Calendar'
import LoadingSpinner from '../common/LoadingSpinner'


const Dashboard = () => {
  const navigate = useNavigate()
  const { user, loading, activeProject, myProjects, switchProject, activeRole } = useAuth()

  const [myTimesheets, setMyTimesheets] = React.useState([])
  const [greeting, setGreeting] = React.useState('')
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [upcomingHolidays, setUpcomingHolidays] = useState([])

  // Super Manager State
  const [allTimesheets, setAllTimesheets] = useState([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('submitted')

  // C-Suite State
  const [cSuiteStats, setCSuiteStats] = React.useState({ projects: 0, employees: 0, bench: 0 })
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  React.useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  React.useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    const fetchStats = async () => {
      if (!user) return
      try {




        // My timesheets for everyone
        const timesheetRes = await axiosInstance.get('/api/timesheet/my-timesheets')
        setMyTimesheets(timesheetRes.data.timesheets?.slice(0, 5) || [])

        // Super Manager - Fetch ALL timesheets
        if (user.role === 'supermanager' || user.role === 'admin') {
          setLoadingAll(true)
          const allRes = await axiosInstance.get('/api/timesheet/all')
          setAllTimesheets(allRes.data.timesheets || [])
          setLoadingAll(false)
        }

        // C-Suite - Fetch specific stats
        if (user.role === 'c-suite') {
          const res = await axiosInstance.get('/api/projects')
          if (res.data && res.data.projects) {
            const projects = res.data.projects
            const active = projects.filter(p => p.projectName !== 'Ready-to-deploy resources').length
            const benchProject = projects.find(p => p.projectName === 'Ready-to-deploy resources')
            const benchCount = benchProject?.employees?.length || 0

            const uniqueEmp = new Set()
            projects.forEach(p => p.employees?.forEach(e => uniqueEmp.add(e._id || e.id)))

            setCSuiteStats({
              projects: active,
              employees: uniqueEmp.size,
              bench: benchCount
            })
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        if (user.role === 'supermanager') setLoadingAll(false)
      }
    }

    if (user) fetchStats()
  }, [user, activeRole])

  React.useEffect(() => {
    if (!user) return
    const currentYear = new Date().getFullYear()
    const today = new Date()
    axiosInstance.get(`/api/cms/holidays?year=${currentYear}`)
      .then(res => {
        const list = res.data.holidays || []
        const next = list
          .filter(h => {
            const hDate = new Date(currentYear, h.month, h.day)
            return hDate >= new Date(currentYear, today.getMonth(), today.getDate())
          })
          .slice(0, 3)
        setUpcomingHolidays(next)
      })
      .catch(() => setUpcomingHolidays([]))
  }, [user])

  // --- Helpers for Super Manager View ---
  const filteredAllTimesheets = allTimesheets.filter(ts => {
    const matchesSearch =
      ts.employeeId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ts.employeeId?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ts.projectId?.projectName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || ts.status?.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'rejected': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      case 'submitted': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
    }
  }

  if (loading || !user) {
    return <LoadingSpinner fullScreen />
  }

  // --- C-SUITE VIEW ---
  if (user.role === 'c-suite') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 transition-colors">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user.fullName || user.username}</span>
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <FiUsers className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Staff</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cSuiteStats.employees}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                      <FiFolder className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active Projects</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cSuiteStats.projects}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg">
                      <FiClock className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">On Bench</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cSuiteStats.bench}</p>
                </div>
              </div>

              <div
                onClick={() => navigate('/project-view')}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <FiInbox className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Project Overview</h2>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Manage all projects & resources</p>
                  </div>
                </div>
                <FiExternalLink className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden p-1 transition-colors">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  className="!border-0 !shadow-none w-full !bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- STANDARD DASHBOARD (Manager, Employee, HR, etc) ---
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {greeting}, <span className="text-indigo-600 dark:text-indigo-400">{user.fullName || user.username}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>

          {/* Project Switcher (Excel-like Basic Design) */}
          {user?.role !== 'admin' && myProjects.length > 0 && (
            <div className="relative z-40 min-w-[200px]">
              {/* Trigger Button - Basic Input Style */}
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className={`flex items-center justify-between w-full px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-400 dark:border-gray-600 ${showProjectDropdown ? 'rounded-t-md border-b-0' : 'rounded-md'} transition-none`}
              >
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                  {activeProject?.projectName || 'Select Project'}
                </span>
                <FiChevronDown className="w-4 h-4 text-gray-600 shrink-0 ml-2" />
              </button>

              {/* Dropdown Menu - Attached, Box-like */}
              {showProjectDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProjectDropdown(false)}></div>
                  <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-600 border-t-0 rounded-b-md shadow-sm z-50">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {myProjects.map(project => {
                        const isActive = (activeProject?._id === project._id || activeProject?.id === project.id);
                        return (
                          <button
                            key={project._id || project.id}
                            onClick={() => {
                              switchProject(project._id || project.id);
                              setShowProjectDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm whitespace-nowrap
                              ${isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700'
                              }
                            `}
                          >
                            <div className="truncate">{project.projectName}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        < div className="grid grid-cols-1 lg:grid-cols-3 gap-8" >

          {/* Left Column - Stats & Cards */}
          < div className="lg:col-span-2 space-y-8" >



            {/* COLORFUL FEATURE CARDS (Employee Dashboard Style) */}
            < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" >

              {/* Projects Card - Blue */}
              < Link to="/projects" className="group relative overflow-hidden bg-blue-500 rounded-2xl p-6 text-white shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl" >
                <div className="relative z-10 flex flex-col h-full bg-blue-500">
                  <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white backdrop-blur-sm">
                    <FiFolder className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">My Projects</h3>
                  <p className="text-blue-100 text-sm font-medium mb-4">View Assigned</p>
                  <div className="mt-auto">
                    <span className="text-3xl font-bold">{myProjects.length}</span>
                    <span className="text-blue-200 text-sm ml-2">Active</span>
                  </div>
                </div>
                {/* Decorative Icon Background */}
                <FiFolder className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />
              </Link >

              {/* Timesheet Card - Pink/Rose */}
              < Link to="/timesheet" className="group relative overflow-hidden bg-rose-500 rounded-2xl p-6 text-white shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl" >
                <div className="relative z-10 flex flex-col h-full bg-rose-500">
                  <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white backdrop-blur-sm">
                    <FiClock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Timesheets</h3>
                  <p className="text-rose-100 text-sm font-medium mb-4">Track Hours</p>
                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold">{myTimesheets.length > 0 ? 1 : 0}</span>
                      <span className="text-rose-200 text-sm ml-2">Pending</span>
                    </div>
                    {/* Status Badge of last timesheet */}
                    {myTimesheets.length > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md bg-black/20 text-white`}>
                        {myTimesheets[0].status}
                      </span>
                    )}
                  </div>
                </div>
                {/* Decorative Icon Background */}
                <FiClock className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />
              </Link >

              {/* Grievance Card - Teal/Emerald */}
              < Link to="/grievance" className="group relative overflow-hidden bg-emerald-500 rounded-2xl p-6 text-white shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl" >
                <div className="relative z-10 flex flex-col h-full bg-emerald-500">
                  <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white backdrop-blur-sm">
                    <FiAlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Grievance</h3>
                  <p className="text-emerald-100 text-sm font-medium mb-4">Support & Help</p>
                  <div className="mt-auto">
                    <span className="text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors">
                      Raise Ticket &rarr;
                    </span>
                  </div>
                </div>
              </Link >
            </div >

            {/* Recent Activity Section */}
            {
              user.role !== 'supermanager' && user.role !== 'admin' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                  <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
                    <button onClick={() => setShowHistoryModal(true)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                      View All History
                    </button>
                  </div>
                  {myTimesheets.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {myTimesheets.slice(0, 3).map((ts) => (
                        <div key={ts._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${ts.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                              ts.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                                'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                              }`}>
                              {ts.status === 'approved' ? <FiCheckCircle /> :
                                ts.status === 'rejected' ? <FiXCircle /> : <FiClock />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{ts.month} Timesheet</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Submitted on {new Date(ts.submittedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${ts.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                              ts.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                                'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                              }`}>
                              {ts.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4 text-gray-400">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No recent activity found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your recent timesheet submissions will appear here</p>
                    </div>
                  )}
                </div>
              )
            }
          </div >

          {/* Right Column - Calendar & Holidays */}
          < div className="space-y-6" >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden p-1 max-w-[280px] mx-auto w-full transition-colors">
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                className="!border-0 !shadow-none w-full !bg-transparent"
              />
            </div>

            {/* Upcoming Holidays Mini List */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <FiCalendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Upcoming Holidays</h3>
              </div>
              <div className="space-y-4">
                {upcomingHolidays.length > 0 ? upcomingHolidays.map((h, i) => {
                  const currentYear = new Date().getFullYear()
                  const dateStr = new Date(currentYear, h.month, h.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  return (
                    <div key={h._id || i} className="flex items-center gap-3">
                      <div className="flex-col flex items-center justify-center w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(currentYear, h.month, h.day).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{h.day}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{h.name}</p>
                        <p className="text-xs text-gray-400">{dateStr}</p>
                      </div>
                    </div>
                  )
                }) : (
                  <p className="text-sm text-gray-400">No upcoming holidays this year.</p>
                )}
              </div>
              <Link to="/holiday-calendar" className="block text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-4 hover:underline">
                View Full Calendar
              </Link>
            </div>
          </div >
        </div >

        {/* --- SUPER MANAGER: ALL TIMESHEETS SECTION --- */}
        {
          (user.role === 'supermanager' || user.role === 'admin') && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
              <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">All Timesheets (Organization View)</h2>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg transition-colors">
                    <button
                      onClick={() => setStatusFilter('submitted')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'submitted' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setStatusFilter('approved')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'approved' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>

              {loadingAll ? (
                <div className="p-8 flex justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider text-xs transition-colors">
                      <tr>
                        <th className="px-6 py-3">Employee</th>
                        <th className="px-6 py-3">Project</th>
                        <th className="px-6 py-3">Month</th>
                        <th className="px-6 py-3">Submitted</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAllTimesheets.length > 0 ? filteredAllTimesheets.map(ts => (
                        <tr key={ts._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                            {ts.employeeId?.fullName || ts.employeeId?.username}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{ts.projectId?.projectName || ts.projectName}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{ts.month}</td>
                          <td className="px-6 py-4 text-gray-400 dark:text-gray-500">{new Date(ts.submittedAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(ts.status)} shadow-sm`}>
                              {ts.status}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                            No timesheets found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        }

        {/* History Modal */}
        {
          showHistoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-scale-in transition-colors">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Submission History</h3>
                  <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                    <FiXCircle className="w-6 h-6" />
                  </button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4">
                  {myTimesheets.map((ts) => (
                    <div key={ts._id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-between hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-sm transition-all bg-white dark:bg-gray-800/50">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${ts.status === 'approved' ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
                          ts.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' :
                            'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400'
                          }`}>
                          {ts.status === 'approved' ? <FiCheckCircle /> :
                            ts.status === 'rejected' ? <FiXCircle /> : <FiClock />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{ts.month} Timesheet</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Submitted on {new Date(ts.submittedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${ts.status === 'approved' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' :
                        ts.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' :
                          'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300'
                        }`}>
                        {ts.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

      </div >
    </div >
  )
}

export default Dashboard
