import React, { useState, useEffect } from 'react'
import { FiUsers, FiSearch, FiMail, FiPhone, FiBriefcase, FiUser, FiX, FiFilter, FiCalendar, FiMapPin } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../common/LoadingSpinner'
import { getProfileImageUrl } from '../../../config/apiConfig'

const KnowYourEmployee = () => {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState('all')
    const [filterDepartment, setFilterDepartment] = useState('all')
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        fetchEmployees()
    }, [])

    const fetchEmployees = async () => {
        try {
            setLoading(true)
            const res = await axiosInstance.get('/api/employees')
            // Backend returns both 'employees' and 'users' for compatibility
            const allUsers = res.data.users || res.data.employees || []
            
            // Backend already sorts by employeeId, but ensure sorting here as well
            const sortedUsers = allUsers.sort((a, b) => {
                const idA = a.employeeId || ''
                const idB = b.employeeId || ''
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
            })
            
            setEmployees(sortedUsers)
        } catch (error) {
            console.error('Error fetching employees:', error)
            toast.error('Failed to load employee directory')
        } finally {
            setLoading(false)
        }
    }

    const filteredEmployees = employees.filter(emp => {
        const q = (searchQuery || '').trim().toLowerCase()
        const fullName = (emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()).toLowerCase()
        const matchesSearch = !q ||
            fullName.includes(q) ||
            (emp.email || emp.officialEmail || '').toLowerCase().includes(q) ||
            (emp.employeeId || '').toLowerCase().includes(q) ||
            (emp.role || '').toLowerCase().includes(q) ||
            (emp.department || '').toLowerCase().includes(q) ||
            (emp.designation || '').toLowerCase().includes(q)
        
        const matchesRole = filterRole === 'all' || (emp.role || '').toLowerCase() === filterRole.toLowerCase()
        const matchesDepartment = filterDepartment === 'all' || (emp.department || '').toLowerCase() === filterDepartment.toLowerCase()
        
        return matchesSearch && matchesRole && matchesDepartment
    })

    // Get unique departments and roles for filters
    const uniqueDepartments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort()
    const uniqueRoles = [...new Set(employees.map(emp => emp.role).filter(Boolean))].sort()

    // Check if any filters or search is active
    const hasActiveFilters = searchQuery || filterRole !== 'all' || filterDepartment !== 'all'

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'manager': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            case 'hr': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            case 'tl':
            case 'team_lead': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
            case 'employee': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            case 'supermanager':
            case 'super_manager': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        }
    }

    const formatDate = (date) => {
        if (!date) return ''
        const d = new Date(date)
        if (isNaN(d.getTime())) return ''
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 p-4">
            {/* Header - compact */}
            <div className="mb-3 flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <FiUsers className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                    Know Your Employee
                </h1>

                {/* Search Bar and Filter - compact */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-0">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Enter Emp. Name or ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 rounded-lg border transition-all ${
                                showFilters || hasActiveFilters
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <FiFilter className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Role
                                    </label>
                                    <select
                                        value={filterRole}
                                        onChange={(e) => setFilterRole(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="all">All Roles</option>
                                        {uniqueRoles.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Department
                                    </label>
                                    <select
                                        value={filterDepartment}
                                        onChange={(e) => setFilterDepartment(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="all">All Departments</option>
                                        {uniqueDepartments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {(filterRole !== 'all' || filterDepartment !== 'all') && (
                                <button
                                    onClick={() => {
                                        setFilterRole('all')
                                        setFilterDepartment('all')
                                    }}
                                    className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - takes remaining space, no overflow */}
            {loading ? (
                <div className="flex justify-center items-center flex-1 min-h-0">
                    <LoadingSpinner />
                </div>
            ) : (
                /* Split Layout - min-h-0 + overflow-hidden constrains height so scrollbar appears */
                <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 overflow-hidden">
                    {/* Left Panel - fixed height, scrollbar in list; no expansion */}
                    <div className="w-full md:w-[320px] md:min-w-[320px] flex-1 min-h-0 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">Start Searching</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Use the search bar or filters to find employees
                            </p>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
                            {!hasActiveFilters ? (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                                    <FiSearch className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Search or use filters to see employees
                                    </p>
                                </div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <FiUsers className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No employees found</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {searchQuery ? `No results match "${searchQuery}".` : 'No employees match the selected filters.'}
                                    </p>
                                </div>
                            ) : (
                            filteredEmployees.map((emp) => (
                                <div
                                    key={emp._id || emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 last:border-b-0"
                                >
                                    <div className="flex items-center gap-3">
                                        {emp.profileImage ? (
                                            <img
                                                src={getProfileImageUrl(emp.profileImage, emp._id || emp.id)}
                                                alt={emp.fullName || emp.firstName || 'User'}
                                                className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                                                onError={(e) => {
                                                    e.target.style.display = 'none'
                                                    const parent = e.target.parentElement
                                                    if (parent && !parent.querySelector('.avatar-fallback')) {
                                                        const fallback = document.createElement('div')
                                                        fallback.className = 'avatar-fallback w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium text-sm flex-shrink-0'
                                                        fallback.textContent = (emp.fullName || emp.firstName || 'U').charAt(0).toUpperCase()
                                                        parent.appendChild(fallback)
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium text-sm flex-shrink-0">
                                                {(emp.fullName || emp.firstName || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'}
                                            </p>
                                            {emp.employeeId && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    #{emp.employeeId}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Employee Details: no scrollbar, compact fit in card */}
                    <div className="flex-1 min-w-0 w-full md:min-w-[320px] min-h-0 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">
                        {selectedEmployee ? (
                            <div className="h-full p-6 flex flex-col overflow-hidden">
                                {/* Profile - centered, larger avatar and text */}
                                <div className="flex flex-col items-center mb-6 flex-shrink-0">
                                    {selectedEmployee.profileImage ? (
                                        <img
                                            src={getProfileImageUrl(selectedEmployee.profileImage, selectedEmployee._id || selectedEmployee.id)}
                                            alt={selectedEmployee.fullName || 'Employee'}
                                            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0 mb-3"
                                            onError={(e) => {
                                                e.target.style.display = 'none'
                                                const parent = e.target.parentElement
                                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                                    const fallback = document.createElement('div')
                                                    fallback.className = 'avatar-fallback w-24 h-24 rounded-full bg-indigo-500 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 mb-3 shadow-sm'
                                                    fallback.textContent = (selectedEmployee.fullName || selectedEmployee.firstName || 'U').charAt(0).toUpperCase()
                                                    parent.appendChild(fallback)
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-indigo-500 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 mb-3 shadow-sm">
                                            {(selectedEmployee.fullName || selectedEmployee.firstName || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">
                                        {selectedEmployee.fullName || `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || 'Unknown'}
                                    </h2>
                                    {selectedEmployee.employeeId && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">#{selectedEmployee.employeeId}</p>
                                    )}
                                    {selectedEmployee.role && (
                                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(selectedEmployee.role)}`}>
                                            {selectedEmployee.role}
                                        </span>
                                    )}
                                </div>

                                {/* Details - modern 2-col: label | value, larger text */}
                                <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                                    {(selectedEmployee.officialEmail || selectedEmployee.email) && (
                                        <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">Email</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right break-all">{selectedEmployee.officialEmail || selectedEmployee.email}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.phone && (
                                        <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">Phone</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.phone}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.designation && (
                                        <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">Designation</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.designation}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.department && (
                                        <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">Department</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.department}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.location && (
                                        <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">Location</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.location}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.dateOfBirth && (
                                        <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">DOB</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{formatDate(selectedEmployee.dateOfBirth)}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.joiningDate && (
                                        <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">Joining</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{formatDate(selectedEmployee.joiningDate)}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.extensionNumber && (
                                        <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">Ext</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.extensionNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full p-4">
                                <div className="text-center">
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 inline-block mb-3">
                                        <FiUser className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Select an Employee</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Click on an employee from the list to view their details
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default KnowYourEmployee
