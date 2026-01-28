import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import axiosInstance from '../../utils/axiosInstance'
import { Link } from 'react-router-dom'
import { FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiInbox, FiUsers, FiFolder, FiExternalLink, FiSearch, FiFilter, FiCalendar, FiPlus } from 'react-icons/fi'
import Calendar from '../common/Calendar'
import LoadingSpinner from '../common/LoadingSpinner'


const Dashboard = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [pendingCount, setPendingCount] = React.useState(0)
  const [myTimesheets, setMyTimesheets] = React.useState([])
  const [greeting, setGreeting] = React.useState('')
  const [showHistoryModal, setShowHistoryModal] = useState(false)

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
        // Pending counts for managers
        if (['manager', 'hr', 'supermanager'].includes(user.role)) {
          const res = await axiosInstance.get('/api/timesheet/pending')
          setPendingCount(res.data.timesheets?.length || 0)
        }

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {greeting}, <span className="text-indigo-600 dark:text-indigo-400">{user.fullName || user.username}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Stats & Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pending Approvals Card (Manager/HR Only) */}
              {['manager', 'hr', 'supermanager'].includes(user.role) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Approvals</p>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{pendingCount}</h3>
                    </div>
                    <div className={`p-3 rounded-xl ${pendingCount > 0 ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                      <FiAlertCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      to="/approvals/timesheet"
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center group-hover:translate-x-1 transition-transform"
                    >
                      Review Requests &rarr;
                    </Link>
                  </div>
                </div>
              )}

              {/* Timesheet Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Timesheet</h3>
                <Link
                  to="/timesheet"
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white py-3 rounded-xl transition-colors font-medium mb-6"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>New Timesheet</span>
                </Link>

                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium uppercase tracking-wider">Last Submitted Timesheet</p>
                  {myTimesheets.length > 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${myTimesheets[0].status === 'approved' ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
                        myTimesheets[0].status === 'rejected' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' :
                          'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400'
                        }`}>
                        {myTimesheets[0].status === 'approved' ? <FiCheckCircle /> :
                          myTimesheets[0].status === 'rejected' ? <FiXCircle /> : <FiClock />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{myTimesheets[0].month}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold capitalize ${myTimesheets[0].status === 'approved' ? 'text-green-600 dark:text-green-400' :
                            myTimesheets[0].status === 'rejected' ? 'text-red-600 dark:text-red-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`}>
                            {myTimesheets[0].status}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">• {new Date(myTimesheets[0].submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-400 dark:text-gray-500">No submissions found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Holidays Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming Holiday</p>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-2">
                      {(() => {
                        const holidays = [
                          { month: 0, day: 1, name: "New Year", dateStr: "Thursday, January 1" },
                          { month: 0, day: 14, name: "Sankranti/Pongal", dateStr: "Wednesday, January 14" },
                          { month: 0, day: 26, name: "Republic Day", dateStr: "Monday, January 26" },
                          { month: 2, day: 19, name: "Ugadi", dateStr: "Thursday, March 19" },
                          { month: 4, day: 1, name: "May Day", dateStr: "Friday, May 1" },
                          { month: 8, day: 14, name: "Ganesh Chaturthi", dateStr: "Monday, September 14" },
                          { month: 9, day: 2, name: "Gandhi Jayanti", dateStr: "Friday, October 2" },
                          { month: 9, day: 21, name: "Dussehra", dateStr: "Wednesday, October 21" },
                          { month: 10, day: 9, name: "Diwali", dateStr: "Monday, November 09" },
                          { month: 11, day: 25, name: "Christmas", dateStr: "Friday, December 25" },
                        ];
                        const today = new Date();
                        const currentYear = 2026;
                        const nextHoliday = holidays.find(h => {
                          const hDate = new Date(currentYear, h.month, h.day);
                          return hDate >= new Date(currentYear, today.getMonth(), today.getDate());
                        });
                        return nextHoliday ? nextHoliday.name : "No more holidays";
                      })()}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {(() => {
                        const holidays = [
                          { month: 0, day: 1, name: "New Year", dateStr: "Thu, Jan 1" },
                          { month: 0, day: 14, name: "Sankranti/Pongal", dateStr: "Wed, Jan 14" },
                          { month: 0, day: 26, name: "Republic Day", dateStr: "Mon, Jan 26" },
                          { month: 2, day: 19, name: "Ugadi", dateStr: "Thu, Mar 19" },
                          { month: 4, day: 1, name: "May Day", dateStr: "Fri, May 1" },
                          { month: 8, day: 14, name: "Ganesh Chaturthi", dateStr: "Mon, Sep 14" },
                          { month: 9, day: 2, name: "Gandhi Jayanti", dateStr: "Fri, Oct 2" },
                          { month: 9, day: 21, name: "Dussehra", dateStr: "Wed, Oct 21" },
                          { month: 10, day: 9, name: "Diwali", dateStr: "Mon, Nov 09" },
                          { month: 11, day: 25, name: "Christmas", dateStr: "Fri, Dec 25" },
                        ];
                        const today = new Date();
                        const currentYear = 2026;
                        const nextHoliday = holidays.find(h => {
                          const hDate = new Date(currentYear, h.month, h.day);
                          return hDate >= new Date(currentYear, today.getMonth(), today.getDate());
                        });
                        return nextHoliday ? nextHoliday.dateStr : "";
                      })()}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FiCalendar className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="/holiday-calendar"
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center group-hover:translate-x-1 transition-transform"
                  >
                    View Full Calendar &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Regular Recent Activity (For everyone else) */}
            {user.role !== 'supermanager' && user.role !== 'admin' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
                  <button onClick={() => setShowHistoryModal(true)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                    View All History
                  </button>
                </div>
                {myTimesheets.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {myTimesheets.slice(0, 3).map((ts) => (
                      <div key={ts._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${ts.status === 'approved' ? 'bg-green-50 text-green-600' :
                            ts.status === 'rejected' ? 'bg-red-50 text-red-600' :
                              'bg-yellow-50 text-yellow-600'
                            }`}>
                            {ts.status === 'approved' ? <FiCheckCircle /> :
                              ts.status === 'rejected' ? <FiXCircle /> : <FiClock />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{ts.month} Timesheet</p>
                            <p className="text-xs text-gray-500">Submitted on {new Date(ts.submittedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${ts.status === 'approved' ? 'bg-green-50 text-green-700' :
                            ts.status === 'rejected' ? 'bg-red-50 text-red-700' :
                              'bg-yellow-50 text-yellow-700'
                            }`}>
                            {ts.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50/50">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4 text-gray-400">
                      <FiInbox className="w-6 h-6" />
                    </div>
                    <p className="text-gray-500 font-medium">No recent activity found</p>
                    <p className="text-sm text-gray-400 mt-1">Your recent timesheet submissions will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Calendar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden p-1 max-w-[280px] mx-auto w-full transition-colors">
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                className="!border-0 !shadow-none w-full !bg-transparent"
              />
            </div>

            {/* <Link ... /> and Holiday Card removed from here */}
          </div>
        </div>

        {/* --- SUPER MANAGER: ALL TIMESHEETS SECTION --- */}
        {(user.role === 'supermanager' || user.role === 'admin') && (
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
        )}

        {/* History Modal */}
        {showHistoryModal && (
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
        )}

      </div>
    </div>
  )
}

export default Dashboard
