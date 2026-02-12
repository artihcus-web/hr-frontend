import React, { useState, useEffect } from 'react'
import { FiUsers, FiSearch, FiMail, FiPhone, FiBriefcase, FiUser } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../common/LoadingSpinner'

const KnowYourEmployee = () => {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

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

    const filteredEmployees = employees.filter(emp =>
        (emp.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.role || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

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

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiUsers className="text-indigo-600 dark:text-indigo-400" />
                        Know Your Employee
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Browse the complete employee directory</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, email, employee ID, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <FiUsers className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No employees found</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery ? `No results match "${searchQuery}".` : 'No employees available.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Employee ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Phone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Role
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredEmployees.map((emp) => (
                                    <tr key={emp._id || emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {emp.employeeId || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                    {(emp.fullName || emp.firstName || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <FiMail className="w-4 h-4 text-gray-400" />
                                                {emp.email || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <FiPhone className="w-4 h-4 text-gray-400" />
                                                {emp.phone || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(emp.role)}`}>
                                                {emp.role || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Showing {filteredEmployees.length} of {employees.length} employees
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default KnowYourEmployee
