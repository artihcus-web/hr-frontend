import React, { useState, useEffect } from 'react'
import { FiPlus, FiUsers, FiCheck, FiX, FiBriefcase, FiEdit2, FiTrash2 } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../common/LoadingSpinner'


const GrievanceConfig = () => {
    const [types, setTypes] = useState([])
    const [loading, setLoading] = useState(false)
    const [newTypeName, setNewTypeName] = useState('')
    const [hrs, setHrs] = useState([]) // HR Users

    // Modal State
    const [managingType, setManagingType] = useState(null) // Type being edited for HR assignment
    const [selectedHrs, setSelectedHrs] = useState([]) // IDs of selected HRs
    
    // Edit Modal State
    const [editingType, setEditingType] = useState(null) // Type being edited
    const [editTypeName, setEditTypeName] = useState('')
    
    // Delete Confirmation State
    const [deletingType, setDeletingType] = useState(null) // Type being deleted

    useEffect(() => {
        fetchTypes()
        fetchHrs()
    }, [])

    const fetchTypes = async () => {
        try {
            setLoading(true)
            const res = await axiosInstance.get('/api/grievance/admin/types')
            setTypes(res.data.types || [])
        } catch (error) {
            console.error(error)
            toast.error('Failed to load issue types')
        } finally {
            setLoading(false)
        }
    }

    const fetchHrs = async () => {
        try {
            const res = await axiosInstance.get('/api/auth/users')
            // Filter only HR, Admin, SuperManager roles who can handle grievances
            const hrUsers = (res.data.users || []).filter(u =>
                ['hr', 'hr_admin', 'admin', 'super_admin', 'manager', 'supermanager'].includes(u.role)
            )
            setHrs(hrUsers)
        } catch (error) {
            console.error('Error fetching HRs:', error)
        }
    }

    const handleCreateType = async (e) => {
        e.preventDefault()
        if (!newTypeName.trim()) return

        try {
            await axiosInstance.post('/api/grievance/admin/types', { name: newTypeName })
            toast.success('Issue type created')
            setNewTypeName('')
            fetchTypes()
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Failed to create type')
        }
    }

    const handleToggleActive = async (id) => {
        try {
            await axiosInstance.put(`/api/grievance/admin/types/${id}/toggle`)
            fetchTypes()
            toast.success('Status updated')
        } catch (error) {
            console.error(error)
            toast.error('Failed to update status')
        }
    }

    const openAssignModal = (type) => {
        setManagingType(type)
        setSelectedHrs(type.assignedHrs.map(h => h._id))
    }

    const handleSaveAssignments = async () => {
        if (!managingType) return

        try {
            await axiosInstance.put(`/api/grievance/admin/types/${managingType._id}/assign`, {
                assignedHrs: selectedHrs
            })
            toast.success('Assignments updated')
            setManagingType(null)
            fetchTypes()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update assignments')
        }
    }

    const toggleHrSelection = (hrId) => {
        if (selectedHrs.includes(hrId)) {
            setSelectedHrs(selectedHrs.filter(id => id !== hrId))
        } else {
            setSelectedHrs([...selectedHrs, hrId])
        }
    }

    const handleEditType = (type) => {
        setEditingType(type)
        setEditTypeName(type.name)
    }

    const handleUpdateType = async (e) => {
        e.preventDefault()
        if (!editTypeName.trim()) {
            toast.error('Type name cannot be empty')
            return
        }

        try {
            await axiosInstance.put(`/api/grievance/admin/types/${editingType._id}`, {
                name: editTypeName.trim()
            })
            toast.success('Issue type updated successfully')
            setEditingType(null)
            setEditTypeName('')
            fetchTypes()
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Failed to update type')
        }
    }

    const handleDeleteType = async () => {
        if (!deletingType) return

        try {
            await axiosInstance.delete(`/api/grievance/admin/types/${deletingType._id}`)
            toast.success('Issue type deleted successfully')
            setDeletingType(null)
            fetchTypes()
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Failed to delete type')
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiBriefcase className="text-indigo-600" />
                    Grievance Configuration
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage issue types and assign HRs to handle them.</p>
            </div>

            {/* Create Type Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Issue Category</h3>
                <form onSubmit={handleCreateType} className="flex gap-4">
                    <input
                        type="text"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="e.g. Finance, IT Support, Workplace Harassment"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="submit"
                        disabled={!newTypeName.trim()}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <FiPlus /> Add Type
                    </button>
                </form>
            </div>

            {/* Types List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12"><LoadingSpinner /></div>
                ) : types.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">No issue types configured</div>
                ) : (
                    types.map(type => (
                        <div key={type._id} className={`bg-white dark:bg-gray-800 p-5 rounded-xl border-l-4 shadow-sm ${type.isActive ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'} border-y border-r border-gray-200 dark:border-gray-700`}>
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{type.name}</h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openAssignModal(type)}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                        title="Manage HRs"
                                    >
                                        <FiUsers className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleEditType(type)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        title="Edit Type"
                                    >
                                        <FiEdit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setDeletingType(type)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Delete Type"
                                    >
                                        <FiTrash2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(type._id)}
                                        className={`p-1.5 rounded-lg transition-colors ${type.isActive ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        title={type.isActive ? "Deactivate" : "Activate"}
                                    >
                                        {type.isActive ? <FiCheck className="w-5 h-5" /> : <FiX className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned HRs ({type.assignedHrs.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {type.assignedHrs.length > 0 ? (
                                        type.assignedHrs.map(hr => (
                                            <span key={hr._id} className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-800">
                                                {hr.fullName}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-orange-500 italic flex items-center gap-1">
                                            <FiAlertCircle className="w-3 h-3" /> No HRs assigned
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Type Modal */}
            {editingType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Edit Issue Type
                            </h3>
                            <button 
                                onClick={() => {
                                    setEditingType(null)
                                    setEditTypeName('')
                                }} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateType} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Issue Type Name
                                </label>
                                <input
                                    type="text"
                                    value={editTypeName}
                                    onChange={(e) => setEditTypeName(e.target.value)}
                                    placeholder="e.g. Finance, IT Support, Workplace Harassment"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingType(null)
                                        setEditTypeName('')
                                    }}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                                >
                                    Update Type
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Delete Issue Type
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">"{deletingType.name}"</span>?
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                This action cannot be undone. If there are grievances associated with this type, deletion will be prevented.
                            </p>
                        </div>

                        <div className="p-6 flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingType(null)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteType}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {managingType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Assign HRs to "{managingType.name}"
                            </h3>
                            <button onClick={() => setManagingType(null)} className="text-gray-400 hover:text-gray-600">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-500 mb-4">Select the Managers/HRs who should receive tickets for this category.</p>
                            <div className="space-y-2">
                                {hrs.map(hr => (
                                    <div
                                        key={hr._id}
                                        onClick={() => toggleHrSelection(hr._id)}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedHrs.includes(hr._id)
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 shadow-sm'
                                            : 'bg-gray-50 dark:bg-gray-900 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-700 flex items-center justify-center text-indigo-700 dark:text-indigo-200 text-xs font-bold">
                                                {hr.fullName ? hr.fullName.charAt(0) : '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{hr.fullName || 'Unknown User'}</p>
                                                <p className="text-xs text-gray-500">{hr.role}</p>
                                            </div>
                                        </div>
                                        {selectedHrs.includes(hr._id) && (
                                            <FiCheck className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                            <button
                                onClick={() => setManagingType(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAssignments}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                            >
                                Save Assignments
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper for the "No HRs assigned" warning
const FiAlertCircle = ({ className }) => (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className={className} height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
)

export default GrievanceConfig
