import React, { useState, useEffect } from 'react'
import { FiSend, FiInbox, FiClock, FiCheckCircle, FiAlertCircle, FiUser, FiBriefcase } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../common/LoadingSpinner'
import { useAuth } from '../../../context/AuthContext'

const Grievance = () => {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('raise')
    const [loading, setLoading] = useState(false)
    const [sentGrievances, setSentGrievances] = useState([])
    const [receivedGrievances, setReceivedGrievances] = useState([])
    const [allGrievances, setAllGrievances] = useState([]) // For Admin

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

    useEffect(() => {
        if (isAdmin) setActiveTab('all_tickets')
    }, [isAdmin])

    // Form State
    const [types, setTypes] = useState([])
    const [issueTypeId, setIssueTypeId] = useState('')
    const [subject, setSubject] = useState('')
    const [description, setDescription] = useState('')
    const [isHandler, setIsHandler] = useState(false)

    // Filter State
    const [filterStatus, setFilterStatus] = useState('All')
    const [filterStartDate, setFilterStartDate] = useState('')
    const [filterEndDate, setFilterEndDate] = useState('')

    useEffect(() => {
        fetchTypes()
        checkHandlerStatus()
        checkHandlerStatus()
        if (activeTab === 'sent') fetchSent()
        if (activeTab === 'received') fetchReceived()
        if (activeTab === 'all_tickets') fetchAllAdmin()
    }, [activeTab])

    const checkHandlerStatus = async () => {
        try {
            const res = await axiosInstance.get('/api/grievance/check-handler')
            setIsHandler(res.data.isHandler)
        } catch (error) {
            console.error('Error checking handler status', error)
        }
    }

    const fetchTypes = async () => {
        try {
            const res = await axiosInstance.get('/api/grievance/types')
            setTypes(res.data.types || [])
        } catch (error) {
            console.error('Error fetching types:', error)
        }
    }

    const fetchSent = async () => {
        try {
            setLoading(true)
            const res = await axiosInstance.get('/api/grievance/sent')
            setSentGrievances(res.data.grievances || [])
        } catch (error) {
            console.error(error)
            toast.error('Failed to load sent grievances')
        } finally {
            setLoading(false)
        }
    }

    const fetchReceived = async () => {
        try {
            setLoading(true)
            const res = await axiosInstance.get('/api/grievance/received')
            setReceivedGrievances(res.data.grievances || [])
        } catch (error) {
            console.error(error)
            toast.error('Failed to load received grievances')
        } finally {
            setLoading(false)
        }
    }

    const fetchAllAdmin = async () => {
        try {
            setLoading(true)
            const res = await axiosInstance.get('/api/grievance/admin/all')
            setAllGrievances(res.data.grievances || [])
        } catch (error) {
            console.error(error)
            toast.error('Failed to load all grievances')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!issueTypeId || !subject || !description) {
            toast.error('All fields are required')
            return
        }

        try {
            setLoading(true)
            await axiosInstance.post('/api/grievance', {
                issueTypeId,
                subject,
                description
            })
            toast.success('Grievance submitted successfully')
            // Reset form
            setIssueTypeId('')
            setSubject('')
            setDescription('')
            setActiveTab('sent') // Switch to sent tab
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit grievance')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await axiosInstance.put(`/api/grievance/${id}/status`, { status: newStatus })
            toast.success(`Status updated to ${newStatus}`)
            await axiosInstance.put(`/api/grievance/${id}/status`, { status: newStatus })
            toast.success(`Status updated to ${newStatus}`)
            if (activeTab === 'all_tickets') fetchAllAdmin()
            else fetchReceived() // Refresh list
        } catch (error) {
            console.error(error)
            toast.error('Failed to update status')
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            case 'Closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            default: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
        }
    }

    const filterGrievances = (grievances) => {
        return grievances.filter(ticket => {
            // Status Filter
            if (filterStatus !== 'All' && ticket.status !== filterStatus) return false

            // Date Filter
            const ticketDate = new Date(ticket.createdAt).setHours(0, 0, 0, 0)
            if (filterStartDate) {
                const startDate = new Date(filterStartDate).setHours(0, 0, 0, 0)
                if (ticketDate < startDate) return false
            }
            if (filterEndDate) {
                const endDate = new Date(filterEndDate).setHours(0, 0, 0, 0)
                if (ticketDate > endDate) return false
            }

            return true
        })
    }

    const getListToFilter = () => {
        if (activeTab === 'sent') return sentGrievances
        if (activeTab === 'received') return receivedGrievances
        if (activeTab === 'all_tickets') return allGrievances
        return []
    }

    const filteredList = filterGrievances(getListToFilter())

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grievance Portal</h1>
                    <p className="text-gray-500 dark:text-gray-400">Raise tickets to report issues or concerns.</p>
                </div>

                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                    {!isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('raise')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'raise'
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Raise Ticket
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'sent'
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Sent History
                            </button>
                        </>
                    )}

                    {/* Admin unique tab */}
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('all_tickets')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'all_tickets'
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            All Tickets (Global)
                        </button>
                    )}

                    {/* Only show Inbox if user is an ASSIGNED handler OR an Admin (Admins can monitor too) */}
                    {(isHandler || isAdmin) && (
                        <button
                            onClick={() => setActiveTab('received')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'received'
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            {isAdmin ? 'My Assignments' : 'Inbox (Received)'}
                        </button>
                    )}
                </div>
            </div>

            {/* Raise Ticket Form */}
            {activeTab === 'raise' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {/* Issue Type Dropdown */}
                            <div className="relative">
                                <select
                                    required
                                    value={issueTypeId}
                                    onChange={(e) => setIssueTypeId(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition-all text-sm"
                                >
                                    <option value="">Select Category...</option>
                                    {types.map(type => (
                                        <option key={type._id} value={type._id}>{type.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                    <FiBriefcase className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Subject */}
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                                placeholder="Subject..."
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>

                        {/* Description & Submit Row */}
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1 w-full">
                                <textarea
                                    required
                                    rows="2"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y text-sm"
                                    placeholder="Brief description of the issue..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !issueTypeId}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-[42px]"
                            >
                                {loading ? <LoadingSpinner size="sm" /> : <FiSend className="w-4 h-4" />}
                                Raise Ticket
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List View (Sent or Received) */}
            {activeTab !== 'raise' && (
                <div className="space-y-4">
                    {/* Filters - Compact Toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm outline-none cursor-pointer"
                        >
                            <option value="All">All Status</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>

                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 shadow-sm">
                            <span className="text-xs text-gray-400 font-medium pl-1">Date:</span>
                            <input
                                type="date"
                                value={filterStartDate}
                                onChange={(e) => setFilterStartDate(e.target.value)}
                                className="border-none p-0 text-sm text-gray-700 dark:text-gray-200 bg-transparent focus:ring-0 cursor-pointer"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                                className="border-none p-0 text-sm text-gray-700 dark:text-gray-200 bg-transparent focus:ring-0 cursor-pointer"
                            />
                        </div>

                        {(filterStatus !== 'All' || filterStartDate || filterEndDate) && (
                            <button
                                onClick={() => {
                                    setFilterStatus('All')
                                    setFilterStartDate('')
                                    setFilterEndDate('')
                                }}
                                className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors px-2"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12"><LoadingSpinner /></div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <FiInbox className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No grievances found</h3>
                            <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or check back later.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredList.map(ticket => (
                                <div key={ticket._id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <FiClock className="w-3 h-3" />
                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {(activeTab === 'received' || activeTab === 'all_tickets') && (
                                            <div className="flex gap-2">
                                                {ticket.status === 'Open' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(ticket._id, 'In Progress')}
                                                        className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        Investigate
                                                    </button>
                                                )}
                                                {ticket.status === 'In Progress' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(ticket._id, 'Resolved')}
                                                        className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        Resolve
                                                    </button>
                                                )}
                                                {ticket.status === 'Resolved' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(ticket._id, 'Closed')}
                                                        className="px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        Close Ticket
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                                        {ticket.subject}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                                        {ticket.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
                                        <FiUser className="w-3 h-3" />
                                        {activeTab === 'sent' ? (
                                            <span>Type: <span className="font-semibold text-gray-700 dark:text-gray-300">{ticket.issueType?.name || 'General'}</span></span>
                                        ) : (
                                            <span>From: <span className="font-semibold text-gray-700 dark:text-gray-300">{ticket.sender?.fullName}</span></span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Grievance
