import React, { useState, useEffect, useRef } from 'react'
import { FiUsers, FiSearch, FiMail, FiPhone, FiBriefcase, FiUser, FiX, FiCalendar, FiMapPin, FiCopy } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import { toast } from '../../../utils/toast'
import LoadingSpinner from '../../common/LoadingSpinner'
import { getProfileImageUrl } from '../../../config/apiConfig'

const KnowYourEmployee = () => {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState('all')
    const [filterDepartment, setFilterDepartment] = useState('all')
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const selectedIdRef = useRef(null)

    useEffect(() => {
        fetchEmployees()
    }, [])

    const onSelectEmployee = (emp) => {
        setSelectedEmployee(emp)
        const id = emp._id
        if (!id) return
        selectedIdRef.current = id
        axiosInstance.get(`/api/employees/${id}`)
            .then(res => {
                if (res.data.employee && selectedIdRef.current === id) {
                    setSelectedEmployee(res.data.employee)
                }
            })
            .catch(() => {})
    }

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

    // Check if any filters or search is active (for clear button)
    const hasActiveFilters = searchQuery || filterRole !== 'all' || filterDepartment !== 'all'

    const formatDate = (date) => {
        if (!date) return ''
        const d = new Date(date)
        if (isNaN(d.getTime())) return ''
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const copyToClipboard = (text, label) => {
        if (!text) return
        navigator.clipboard.writeText(String(text)).then(() => {
            toast.success(`${label} copied`)
        }).catch(() => toast.error('Failed to copy'))
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 p-4">
            {/* Header */}
            <div className="mb-3 flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <FiUsers className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                    Know Your Employee
                </h1>

                {/* Sleek horizontal filter bar: search, role, department, search button */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm min-w-[180px] max-w-[220px]">
                        <FiSearch className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Name or ID"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 min-w-0 py-1.5 bg-transparent border-0 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-0 focus:outline-none"
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[120px]"
                    >
                        <option value="all">All Roles</option>
                        {uniqueRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[140px]"
                    >
                        <option value="all">All Departments</option>
                        {uniqueDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="h-9 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <FiSearch className="w-4 h-4" />
                        Search
                    </button>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setFilterRole('all'); setFilterDepartment('all'); }}
                            className="h-9 px-3 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            Clear
                        </button>
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
                            {filteredEmployees.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    {employees.length === 0 ? (
                                        <>
                                            <FiSearch className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No employees to display</p>
                                        </>
                                    ) : (
                                        <>
                                            <FiUsers className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No employees found</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {searchQuery ? `No results match "${searchQuery}".` : 'No employees match the selected filters.'}
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                            filteredEmployees.map((emp) => (
                                <div
                                    key={emp._id || emp.id}
                                    onClick={() => onSelectEmployee(emp)}
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
                            <div className="h-full px-4 py-3 flex flex-col overflow-hidden">
                                {/* Profile - compact avatar and text */}
                                <div className="flex flex-col items-center mb-3 flex-shrink-0">
                                    {selectedEmployee.profileImage ? (
                                        <img
                                            src={getProfileImageUrl(selectedEmployee.profileImage, selectedEmployee._id || selectedEmployee.id)}
                                            alt={selectedEmployee.fullName || 'Employee'}
                                            className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0 mb-2"
                                            onError={(e) => {
                                                e.target.style.display = 'none'
                                                const parent = e.target.parentElement
                                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                                    const fallback = document.createElement('div')
                                                    fallback.className = 'avatar-fallback w-14 h-14 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0 mb-2 shadow-sm'
                                                    fallback.textContent = (selectedEmployee.fullName || selectedEmployee.firstName || 'U').charAt(0).toUpperCase()
                                                    parent.appendChild(fallback)
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0 mb-2 shadow-sm">
                                            {(selectedEmployee.fullName || selectedEmployee.firstName || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white text-center mb-0.5">
                                        {selectedEmployee.fullName || `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || 'Unknown'}
                                    </h2>
                                    {selectedEmployee.employeeId && (
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">#{selectedEmployee.employeeId}</p>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(selectedEmployee.employeeId, 'Employee ID')}
                                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                                title="Copy employee ID"
                                            >
                                                <FiCopy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Details - compact, no scroll */}
                                <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
                                    {(selectedEmployee.officialEmail || selectedEmployee.email) && (
                                        <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Email</span>
                                            <div className="flex items-center gap-1 min-w-0">
                                                <span className="text-xs font-semibold text-gray-900 dark:text-white text-right break-all truncate">{selectedEmployee.officialEmail || selectedEmployee.email}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(selectedEmployee.officialEmail || selectedEmployee.email, 'Email')}
                                                    className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                                    title="Copy email"
                                                >
                                                    <FiCopy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {selectedEmployee.phone && (
                                        <div className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Phone</span>
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.phone}</span>
                                        </div>
                                    )}
                                    {(selectedEmployee.dateOfBirth || selectedEmployee.birthdayDate) && (
                                        <div className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">DOB</span>
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white text-right">{formatDate(selectedEmployee.dateOfBirth || selectedEmployee.birthdayDate)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Designation</span>
                                        <span className="text-xs font-semibold text-gray-900 dark:text-white text-right">
                                            {String(selectedEmployee.designation ?? '').trim()}
                                        </span>
                                    </div>
                                    {selectedEmployee.department && (
                                        <div className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Department</span>
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.department}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.location && (
                                        <div className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Location</span>
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.location}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.joiningDate && (
                                        <div className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Joining</span>
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white text-right">{formatDate(selectedEmployee.joiningDate)}</span>
                                        </div>
                                    )}
                                    {selectedEmployee.extensionNumber && (
                                        <div className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700/60">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Ext</span>
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white text-right">{selectedEmployee.extensionNumber}</span>
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
