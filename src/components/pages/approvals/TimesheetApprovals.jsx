import React, { useState, useEffect } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../../context/AuthContext'
import {
    FiClock, FiInbox, FiFilter, FiRefreshCw, FiChevronDown, FiChevronUp,
    FiCheckCircle, FiXCircle, FiPauseCircle, FiMessageSquare, FiEdit
} from 'react-icons/fi'
import { getProfileImageUrl } from '../../../config/apiConfig'


const TimesheetApprovals = () => {
    const [timesheets, setTimesheets] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)
    const [expandedRow, setExpandedRow] = useState(null) // ID of expanded row
    const [actionComment, setActionComment] = useState('') // Comment for the active action
    const [activeAction, setActiveAction] = useState({ id: null, type: null }) // track which row action is being confirmed

    const [statusFilter, setStatusFilter] = useState('submitted')
    const { user } = useAuth()

    const fetchTimesheets = React.useCallback(async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const apiUrl = import.meta.env.VITE_API_URL

            // Determine endpoint based on role
            let endpoint = '/api/timesheet/pending'
            if (user && (user.role === 'supermanager' || user.role === 'admin' || user.role === 'super_admin')) {
                endpoint = '/api/timesheet/all'
            }

            const response = await axios.get(`${apiUrl}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setTimesheets(response.data.timesheets || [])
        } catch (error) {
            console.error('Error fetching timesheets:', error)
            toast.error('Failed to load timesheets')
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (user) fetchTimesheets()
    }, [user, fetchTimesheets])

    // Filter timesheets based on active tab
    const filteredTimesheets = timesheets.filter(ts => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'submitted') return ts.status === 'submitted' || ts.status === 'Submitted'
        if (statusFilter === 'approved') return ts.status === 'approved' || ts.status === 'Approved'
        if (statusFilter === 'rejected') return ts.status === 'rejected' || ts.status === 'Rejected'
        return true
    })

    const handleAction = async (id, status, comment) => {
        try {
            setProcessingId(id)
            const token = localStorage.getItem('token')

            const payload = {
                status,
                rejectionReason: comment,
                comments: comment || (status === 'approved' ? 'Approved via Dashboard' : `${status} via Dashboard`)
            }

            const apiUrl = import.meta.env.VITE_API_URL
            await axios.put(`${apiUrl}/api/timesheet/${id}/status`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success(`Timesheet ${status === 'on-hold' ? 'put on hold' : status} successfully`)

            // Update status locally instead of removing
            setTimesheets(prev => prev.map(t => {
                if (t._id === id) {
                    // Normalize status for local state
                    let newStatus = status;
                    if (status === 'approved') newStatus = 'Approved';
                    else if (status === 'rejected') newStatus = 'Rejected';
                    else if (status === 'rejected-edit') newStatus = 'Changes Requested'; // or 'rejected-edit' depending on specific filter matching

                    return { ...t, status: newStatus };
                }
                return t;
            }))

            setActiveAction({ id: null, type: null })
            setActionComment('')

        } catch (error) {
            console.error(`Error updating timesheet ${id}:`, error)
            toast.error(error.response?.data?.message || `Failed to ${status} timesheet`)
        } finally {
            setProcessingId(null)
        }
    }

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id)
    }

    const initiateAction = (id, type) => {
        if (activeAction.id === id && activeAction.type === type) {
            // If clicking same action again, cancel
            setActiveAction({ id: null, type: null })
            setActionComment('')
        } else {
            setActiveAction({ id, type })
            setActionComment('')
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Timesheet Approvals</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review employee timesheet submissions details below</p>
                </div>

                <div className="flex items-center gap-3">
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

                    <button
                        onClick={fetchTimesheets}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Refresh List"
                    >
                        <FiRefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {!filteredTimesheets.length ? (
                <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800 transition-colors"
                >
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                        <FiInbox className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        You have no pending timesheets to review at this moment.
                    </p>
                </Motion.div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 transition-colors">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">Employee</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">Project</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Month</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Total Hours</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Submitted</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">View</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTimesheets.map((timesheet) => {
                                // Helper to parse duration string to minutes for this row
                                const parseDuration = (str) => {
                                    if (!str || str === 'WO' || str === 'FL') return 0;
                                    let match = str.match(/(\d+)\s?:\s?(\d+)/);
                                    if (!match) match = str.match(/(\d+)h\s?(\d+)m?/);
                                    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
                                    return 0;
                                };

                                const totalMins = timesheet.entries?.reduce((acc, curr) => {
                                    return acc + parseDuration(curr.hoursCompleted || curr.totalDailyHours);
                                }, 0) || 0;

                                return (
                                    <React.Fragment key={timesheet._id}>
                                        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors ${expandedRow === timesheet._id ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center">
                                                    {timesheet.employeeId?.profileImage ? (
                                                        <img
                                                            src={getProfileImageUrl(timesheet.employeeId.profileImage, timesheet.employeeId._id || timesheet.employeeId.id)}
                                                            alt={timesheet.employeeId?.fullName || timesheet.employeeName || 'User'}
                                                            className="h-8 w-8 rounded-full object-cover flex-shrink-0 transition-colors border border-gray-200 dark:border-gray-700"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none'
                                                                const parent = e.target.parentElement
                                                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                                                    const fallback = document.createElement('div')
                                                                    fallback.className = 'avatar-fallback h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0 transition-colors'
                                                                    fallback.textContent = (timesheet.employeeId?.fullName || timesheet.employeeName || 'U').charAt(0)
                                                                    parent.appendChild(fallback)
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    {(!timesheet.employeeId?.profileImage || !getProfileImageUrl(timesheet.employeeId?.profileImage, timesheet.employeeId?._id || timesheet.employeeId?.id)) && (
                                                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0 transition-colors avatar-fallback">
                                                            {(timesheet.employeeId?.fullName || timesheet.employeeName || 'U').charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="ml-3 truncate">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate transition-colors">
                                                            {timesheet.employeeId?.fullName || timesheet.employeeName}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px] transition-colors">
                                                            {timesheet.employeeId?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700 truncate max-w-[200px]" title={timesheet.projectId?.projectName || timesheet.projectName || 'General'}>
                                                {timesheet.projectId?.projectName || timesheet.projectName || 'General'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                                {timesheet.month}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {(totalMins / 60).toFixed(2)} hrs
                                                <span className="text-xs text-gray-500 ml-1">({timesheet.entries?.length} entries)</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(timesheet.submittedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    {/* Approve Button - Hide if already approved */}
                                                    {!['Approved', 'approved'].includes(timesheet.status) && (
                                                        <>
                                                            <button
                                                                onClick={() => initiateAction(timesheet._id, 'approved')}
                                                                disabled={processingId === timesheet._id}
                                                                className={`p-1.5 rounded-full transition-colors ${activeAction.id === timesheet._id && activeAction.type === 'approved'
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-2 ring-green-500 dark:ring-green-400'
                                                                    : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                                    }`}
                                                                title="Approve"
                                                            >
                                                                <FiCheckCircle className="w-5 h-5" />
                                                            </button>

                                                            {/* Reject Button */}
                                                            <button
                                                                onClick={() => initiateAction(timesheet._id, 'rejected-edit')}
                                                                disabled={processingId === timesheet._id}
                                                                className={`p-1.5 rounded-full transition-colors ${activeAction.id === timesheet._id && activeAction.type === 'rejected-edit'
                                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-2 ring-red-500 dark:ring-red-400'
                                                                    : 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                                    }`}
                                                                title="Reject (Editable Resubmit)"
                                                            >
                                                                <FiXCircle className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Request Changes Button (Always visible) */}

                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => toggleRow(timesheet._id)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    {expandedRow === timesheet._id ? (
                                                        <FiChevronUp className="w-5 h-5" />
                                                    ) : (
                                                        <FiChevronDown className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Action Confirmation Row */}
                                        <AnimatePresence>
                                            {activeAction.id === timesheet._id && (
                                                <Motion.tr
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="bg-gray-50"
                                                >
                                                    <td colSpan="7" className="px-6 py-4">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="flex-1">
                                                                <input
                                                                    type="text"
                                                                    placeholder={`Add a comment for ${activeAction.type === 'approved' ? 'approval' : 'rejection/changes'} (optional)...`}
                                                                    value={actionComment}
                                                                    onChange={(e) => setActionComment(e.target.value)}
                                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => handleAction(timesheet._id, activeAction.type, actionComment)}
                                                                disabled={processingId === timesheet._id}
                                                                className={`px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${activeAction.type === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                                                                    activeAction.type === 'on-hold' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                                                        activeAction.type === 'rejected-edit' ? 'bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-600' :
                                                                            'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600'
                                                                    }`}
                                                            >
                                                                {processingId === timesheet._id ? 'Processing...' :
                                                                    activeAction.type === 'rejected-edit' ? 'Confirm Request Changes' :
                                                                        `Confirm ${activeAction.type.charAt(0).toUpperCase() + activeAction.type.slice(1)}`}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveAction({ id: null, type: null })
                                                                    setActionComment('')
                                                                }}
                                                                className="text-gray-500 hover:text-gray-700 text-sm"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </td>
                                                </Motion.tr>
                                            )}
                                        </AnimatePresence>

                                        {/* Expanded Details Row */}
                                        <AnimatePresence>
                                            {expandedRow === timesheet._id && (() => {
                                                // Helper to parse duration string to minutes
                                                const parseDuration = (str) => {
                                                    if (!str || str === 'WO' || str === 'FL') return 0;
                                                    let match = str.match(/(\d+)\s?:\s?(\d+)/);
                                                    if (!match) match = str.match(/(\d+)h\s?(\d+)m?/);
                                                    if (match) return parseInt(match[1]) * 60 + parseInt(match[2] || 0);
                                                    return 0;
                                                };

                                                // Helper to format minutes to duration string
                                                const formatDuration = (minutes) => {
                                                    const h = Math.floor(minutes / 60);
                                                    const m = minutes % 60;
                                                    return `${h} : ${String(m).padStart(2, '0')}`;
                                                };

                                                // Group entries by charge code/project
                                                const groupedRows = {};
                                                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                                                if (timesheet.entries && timesheet.entries.length > 0) {
                                                    timesheet.entries.forEach(entry => {
                                                        const key = `${entry.projectId || 'unknown'}-${entry.chargeCode || 'General'}`;
                                                        if (!groupedRows[key]) {
                                                            groupedRows[key] = {
                                                                chargeCode: entry.chargeCode || 'General',
                                                                dailyHours: Array(7).fill('0 : 00'),
                                                                totalHours: 0
                                                            };
                                                        }

                                                        // Find day index (Mon=0, Tue=1, etc.)
                                                        const entryDate = new Date(entry.date);
                                                        const dayIndex = (entryDate.getDay() + 6) % 7; // Convert Sun=0 to Mon=0

                                                        if (dayIndex >= 0 && dayIndex < 7) {
                                                            groupedRows[key].dailyHours[dayIndex] = entry.hoursCompleted || entry.totalDailyHours || '0 : 00';
                                                        }
                                                    });

                                                    // Calculate row totals
                                                    Object.keys(groupedRows).forEach(key => {
                                                        const row = groupedRows[key];
                                                        const totalMins = row.dailyHours.reduce((acc, val) => acc + parseDuration(val), 0);
                                                        row.totalHours = formatDuration(totalMins);
                                                    });
                                                }

                                                // Calculate daily totals
                                                const dailyTotals = Array(7).fill(0);
                                                Object.values(groupedRows).forEach(row => {
                                                    row.dailyHours.forEach((hours, idx) => {
                                                        dailyTotals[idx] += parseDuration(hours);
                                                    });
                                                });

                                                // Get week start date
                                                let weekStart = null;
                                                if (timesheet.weekStartDate) {
                                                    weekStart = new Date(timesheet.weekStartDate);
                                                } else if (timesheet.entries && timesheet.entries.length > 0) {
                                                    const dates = timesheet.entries.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
                                                    if (dates.length > 0) {
                                                        const earliest = new Date(Math.min(...dates));
                                                        const day = earliest.getDay();
                                                        const diff = earliest.getDate() - day + (day === 0 ? -6 : 1);
                                                        weekStart = new Date(earliest);
                                                        weekStart.setDate(diff);
                                                    }
                                                }

                                                // Get week days
                                                const weekDays = [];
                                                if (weekStart) {
                                                    for (let i = 0; i < 7; i++) {
                                                        const d = new Date(weekStart);
                                                        d.setDate(weekStart.getDate() + i);
                                                        weekDays.push({
                                                            date: d.getDate().toString().padStart(2, '0'),
                                                            name: dayNames[i]
                                                        });
                                                    }
                                                } else {
                                                    for (let i = 0; i < 7; i++) {
                                                        weekDays.push({ date: '', name: dayNames[i] });
                                                    }
                                                }

                                                const grandTotalMins = dailyTotals.reduce((acc, val) => acc + val, 0);

                                                return (
                                                    <Motion.tr
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                    >
                                                        <td colSpan="7" className="px-0 py-0 border-b border-gray-200 dark:border-gray-800">
                                                            <div className="bg-gray-50 dark:bg-gray-950/50 p-6 transition-colors">
                                                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center transition-colors">
                                                                    <FiClock className="mr-2" /> Timesheet Details
                                                                </h4>
                                                                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-indigo-600">
                                                                            <tr>
                                                                                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-[200px]">Project Code</th>
                                                                                {weekDays.map((day, idx) => (
                                                                                    <th key={idx} className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                                                                                        {day.date} {day.name}
                                                                                    </th>
                                                                                ))}
                                                                                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Total</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800 transition-colors">
                                                                            {Object.values(groupedRows).map((row, idx) => (
                                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                                    <td className="px-4 py-3 text-sm font-bold text-gray-800">
                                                                                        {row.chargeCode}
                                                                                    </td>
                                                                                    {row.dailyHours.map((hours, dayIdx) => {
                                                                                        const display = hours === 'WO' ? 'WO' : hours === 'FL' ? 'FL' : hours;
                                                                                        return (
                                                                                            <td key={dayIdx} className="px-4 py-3 text-sm text-center text-gray-700">
                                                                                                {display}
                                                                                            </td>
                                                                                        );
                                                                                    })}
                                                                                    <td className="px-4 py-3 text-sm text-center font-bold text-gray-800 bg-gray-50">
                                                                                        {row.totalHours}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                        <tfoot className="bg-gray-100">
                                                                            <tr>
                                                                                <td className="px-4 py-3 text-sm font-bold text-gray-900">Daily Total</td>
                                                                                {dailyTotals.map((total, idx) => (
                                                                                    <td key={idx} className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                                                                                        {formatDuration(total)}
                                                                                    </td>
                                                                                ))}
                                                                                <td className="px-4 py-3 text-sm text-center font-bold text-indigo-600 bg-indigo-50">
                                                                                    {formatDuration(grandTotalMins)}
                                                                                </td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </Motion.tr>
                                                );
                                            })()}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                        </tbody >
                    </table >
                </div >
            )}
        </div >
    )
}

export default TimesheetApprovals
