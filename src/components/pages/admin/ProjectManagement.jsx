import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FiPlus, FiEdit2, FiTrash2, FiHash, FiX, FiUsers, FiUserCheck, FiUserX, FiFolder, FiSave, FiArrowLeft, FiInfo, FiEdit3, FiSearch } from 'react-icons/fi'
import toast from 'react-hot-toast'

function ProjectManagement() {
  const navigate = useNavigate()
  const { user, token, loading } = useAuth()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [editingProject, setEditingProject] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [formData, setFormData] = useState({
    projectName: '',
    projectId: '',
    description: '',
    status: 'active'
  })

  const [submitting, setSubmitting] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [availableEmployees, setAvailableEmployees] = useState([])
  const [availableManagers, setAvailableManagers] = useState([])
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [selectedManagerIds, setSelectedManagerIds] = useState([])

  const [assigningEmployees, setAssigningEmployees] = useState(false)
  const [assigningManagers, setAssigningManagers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.projectId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
      return
    }
    if (user && user.role !== 'admin') {
      navigate('/')
    }
  }, [navigate, user, loading])

  // Fetch projects list
  const fetchProjects = useCallback(async (updateSelected = false) => {
    if (!token) return

    try {
      setLoadingProjects(true)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (res.ok) {
        const fetchedProjects = data.projects || []

        // Pin "Ready-to-deploy resources" to top
        const updatedProjects = fetchedProjects.sort((a, b) => {
          if (a.projectName === 'Ready-to-deploy resources') return -1
          if (b.projectName === 'Ready-to-deploy resources') return 1
          return new Date(b.createdAt) - new Date(a.createdAt)
        })

        setProjects(updatedProjects)

        // Update selected project if requested
        if (updateSelected && selectedProject) {
          const updatedProject = updatedProjects.find(
            p => (p._id || p.id) === (selectedProject._id || selectedProject.id)
          )
          if (updatedProject) {
            setSelectedProject(updatedProject)
          }
        }
      } else {
        toast.error(data.message || 'Failed to fetch projects')
      }
    } catch {
      toast.error('Network error while fetching projects')
    } finally {
      setLoadingProjects(false)
    }
  }, [token, selectedProject])

  useEffect(() => {
    if (user && user.role === 'admin' && token && !showForm) {
      fetchProjects()
    }
  }, [user, token, showForm, fetchProjects])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Load project data into form for editing
  const handleEdit = async (projectId) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (res.ok && data.project) {
        setFormData({
          projectName: data.project.projectName || '',
          projectId: data.project.projectId || '',
          description: data.project.description || '',
          status: data.project.status || 'active'
        })

        setEditingProject(projectId)
        setShowForm(true)
      } else {
        toast.error(data.message || 'Failed to load project data')
      }
    } catch {
      toast.error('Network error while loading project data')
    }
  }

  // Handle delete with confirmation
  const handleDeleteClick = (project) => {
    if (project.projectName === 'Ready-to-deploy resources') {
      alert('System Project: "Ready-to-deploy resources" cannot be deleted. It is required for managing unassigned employees.')
      return
    }
    setDeleteConfirmation(project)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation || !token) return

    setDeleting(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${deleteConfirmation._id || deleteConfirmation.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Project deleted successfully')
        setDeleteConfirmation(null)
        await fetchProjects()
      } else {
        toast.error(data.message || 'Failed to delete project')
        setDeleteConfirmation(null)
      }
    } catch {
      toast.error('Network error while deleting project')
      setDeleteConfirmation(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null)
  }

  const resetForm = () => {
    setFormData({
      projectName: '',
      projectId: '',
      description: '',
      status: 'active'
    })
    setEditingProject(null)
    setError(null)
    setMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setError('Not authenticated')
      return
    }

    if (!formData.projectName || !formData.projectId) {
      toast.error('Project name and Project ID are required')
      return
    }

    setSubmitting(true)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const url = editingProject
        ? `${API_URL}/api/projects/${editingProject}`
        : `${API_URL}/api/projects`

      const res = await fetch(url, {
        method: editingProject ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || `Failed to ${editingProject ? 'update' : 'create'} project`)
      } else {
        toast.success(`Project ${editingProject ? 'updated' : 'created'} successfully`)
        resetForm()
        setShowForm(false)
        await fetchProjects()
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'inactive': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      case 'completed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'on-hold': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }
  }

  const handleProjectClick = async (project) => {
    setSelectedProject(project)
    setSelectedEmployeeIds([])
    setSelectedManagerIds([])
    await fetchAvailableUsers(project._id || project.id)
  }

  const fetchAvailableUsers = async (projectId) => {
    if (!token) return

    try {
      setLoadingAvailableUsers(true)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const isReadyToDeploy = projects.find(p => (p._id || p.id) === projectId)?.projectName === 'Ready-to-deploy resources'
      const unassignedOnly = isReadyToDeploy ? 'true' : 'false'

      const res = await fetch(`${API_URL}/api/projects/${projectId}/available-users?unassignedOnly=${unassignedOnly}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (res.ok) {
        setAvailableEmployees(data.employees || [])
        setAvailableManagers(data.managers || [])
      } else {
        toast.error(data.message || 'Failed to fetch available users')
      }
    } catch {
      toast.error('Network error while fetching available users')
    } finally {
      setLoadingAvailableUsers(false)
    }
  }

  const handleAssignEmployees = async () => {
    if (!selectedProject || selectedEmployeeIds.length === 0) return

    setAssigningEmployees(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${selectedProject._id || selectedProject.id}/assign-employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employeeIds: selectedEmployeeIds })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Employees assigned successfully')
        setSelectedEmployeeIds([])
        await fetchProjects(true)
        await fetchAvailableUsers(selectedProject._id || selectedProject.id)
      } else {
        toast.error(data.message || 'Failed to assign employees')
      }
    } catch {
      toast.error('Network error while assigning employees')
    } finally {
      setAssigningEmployees(false)
    }
  }

  const handleAssignManagers = async (ids = null) => {
    const idsToAssign = Array.isArray(ids) ? ids : selectedManagerIds
    if (!selectedProject || idsToAssign.length === 0) return

    setAssigningManagers(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${selectedProject._id || selectedProject.id}/assign-managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ managerIds: idsToAssign })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Project managers assigned successfully')
        setSelectedManagerIds([])
        await fetchProjects(true)
        await fetchAvailableUsers(selectedProject._id || selectedProject.id)
      } else {
        toast.error(data.message || 'Failed to assign managers')
      }
    } catch {
      toast.error('Network error while assigning managers')
    } finally {
      setAssigningManagers(false)
    }
  }

  const handleRemoveEmployee = async (employeeId) => {
    if (!selectedProject) return

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${selectedProject._id || selectedProject.id}/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Employee removed successfully')
        await fetchProjects(true)
        await fetchAvailableUsers(selectedProject._id || selectedProject.id)
      } else {
        toast.error(data.message || 'Failed to remove employee')
      }
    } catch {
      toast.error('Network error while removing employee')
    }
  }

  const handleRemoveManager = async (managerId) => {
    if (!selectedProject) return

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${selectedProject._id || selectedProject.id}/managers/${managerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Project manager removed successfully')
        await fetchProjects(true)
        await fetchAvailableUsers(selectedProject._id || selectedProject.id)
      } else {
        toast.error(data.message || 'Failed to remove manager')
      }
    } catch {
      toast.error('Network error while removing manager')
    }
  }

  const handleAssignManagerMap = async (employeeId, managerId) => {
    if (!selectedProject) return
    setAssigningEmployees(true)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${selectedProject._id || selectedProject.id}/assign-managers-map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assignments: [{ employeeId, managerId }]
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Resource allocation updated')
        await fetchProjects(true)
        await fetchAvailableUsers(selectedProject._id || selectedProject.id)
      } else {
        toast.error(data.message || 'Failed to update allocation')
      }
    } catch {
      toast.error('Network error updating allocation')
    } finally {
      setAssigningEmployees(false)
    }
  }

  const closeProjectDetail = () => {
    setSelectedProject(null)
    setAvailableEmployees([])
    setAvailableManagers([])
    setSelectedEmployeeIds([])
    setSelectedManagerIds([])
  }

  // RETURN 1: Project Detail View
  if (selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Dashboard Style */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <button
                onClick={closeProjectDetail}
                className="group p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                title="Back to Projects"
              >
                <FiArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight uppercase">
                    {selectedProject.projectName}
                  </h1>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(selectedProject.status).replace('bg-100', 'bg-50/50')}`}>
                    {selectedProject.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800 shadow-sm">
                    <FiHash className="w-3.5 h-3.5" /> {selectedProject.projectId}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  closeProjectDetail()
                  handleEdit(selectedProject._id || selectedProject.id)
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all shadow-sm text-sm font-bold"
              >
                <FiEdit2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 overflow-hidden relative group transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FiFolder className="w-4 h-4" /> Project Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {selectedProject.description || "Building excellence through strategic project execution and resource management. This project focuses on high-impact deliverables and cross-functional collaboration across the organization."}
                </p>
              </div>

              {/* Resource Mapping View */}
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest flex items-center gap-2">
                    <FiUserCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    Team Leaders & Mapping
                  </h3>
                  <button
                    onClick={() => fetchAvailableUsers(selectedProject._id || selectedProject.id)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Refresh availability
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedProject.projectManagers?.map(mgr => (
                    <div key={mgr._id || mgr.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-full group transition-colors">
                      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                            {mgr.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'TL'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate" title={mgr.fullName}>{mgr.fullName}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{mgr.role || 'Manager'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveManager(mgr._id || mgr.id)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-4 flex-grow space-y-3 bg-white dark:bg-gray-900 transition-colors">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                          <span>Allocated Resources</span>
                          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold">
                            {selectedProject.managerAssignments?.filter(ma => (ma.manager?._id || ma.manager) === (mgr._id || mgr.id)).length || 0}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {selectedProject.managerAssignments?.filter(ma => (ma.manager?._id || ma.manager) === (mgr._id || mgr.id)).map(ma => (
                            <div key={ma.employee._id || ma.employee} className="flex items-center justify-between p-2.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-50 dark:border-gray-800 group/item hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/20 transition-all">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{ma.employee.fullName}</p>
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{ma.employee.email}</p>
                              </div>
                              <button
                                onClick={() => handleAssignManagerMap(ma.employee._id || ma.employee, null)}
                                className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              >
                                <FiX className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {(!selectedProject.managerAssignments?.filter(ma => (ma.manager?._id || ma.manager) === (mgr._id || mgr.id)).length) && (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                              <FiUsers className="w-6 h-6 text-gray-200 dark:text-gray-800 mb-2" />
                              <p className="text-[11px] text-gray-400 dark:text-gray-600 font-medium italic">No resources mapped</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                        <select
                          className="w-full text-[11px] font-bold border-0 bg-white dark:bg-gray-800 shadow-sm rounded-lg px-3 py-2 outline-none cursor-pointer text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignManagerMap(e.target.value, mgr._id || mgr.id)
                              e.target.value = ""
                            }
                          }}
                          value=""
                        >
                          <option value="">+ Assign Resource</option>
                          {[
                            ...(selectedProject.employees?.filter(e =>
                              !selectedProject.managerAssignments?.find(ma => (ma.employee?._id || ma.employee) === (e._id || e.id) && ma.manager)
                            ) || []),
                            ...availableEmployees
                          ].filter((e, i, self) =>
                            i === self.findIndex((t) => (t._id || t.id) === (e._id || e.id))
                          ).map(emp => (
                            <option key={emp._id || emp.id} value={emp._id || emp.id}>
                              {emp.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {(!selectedProject.projectManagers || selectedProject.projectManagers.length === 0) && (
                    <div className="col-span-full border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center bg-white">
                      <FiUserCheck className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-gray-900 mb-1">No Team Leaders Assigned</p>
                      <p className="text-[11px] text-gray-400 px-6 max-w-xs mx-auto">Assign managers from the right panel to begin mapping resources.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="text-[11px] font-extrabold text-gray-900 uppercase tracking-widest">Resource Allocation</h3>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">Add members to this project's pool</p>
                </div>

                <div className="p-5 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Available Employees ({availableEmployees.length})</label>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-50 rounded-xl bg-gray-50/50 p-2 space-y-1">
                      {availableEmployees.map(emp => (
                        <label key={emp._id || emp.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-transparent hover:border-indigo-100 cursor-pointer transition-all shadow-sm">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.includes(emp._id || emp.id)}
                            onChange={(e) => {
                              const val = emp._id || emp.id;
                              setSelectedEmployeeIds(prev => e.target.checked ? [...prev, val] : prev.filter(id => id !== val));
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{emp.fullName}</p>
                            <p className="text-[9px] text-gray-400 truncate">{emp.email}</p>
                          </div>
                        </label>
                      ))}
                      {availableEmployees.length === 0 && <p className="text-[10px] text-center py-6 text-gray-400 italic font-medium">All resources allocated</p>}
                    </div>
                    <button
                      onClick={handleAssignEmployees}
                      disabled={selectedEmployeeIds.length === 0 || assigningEmployees}
                      className="w-full mt-3 py-2.5 bg-indigo-600 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 uppercase"
                    >
                      {assigningEmployees ? 'Allocating...' : 'Assign Members'}
                    </button>
                  </div>

                  <div className="border-t border-gray-50 pt-6">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4">Available Leaders ({availableManagers.length})</label>
                    <div className="max-h-48 overflow-y-auto border border-gray-50 rounded-xl bg-gray-50/50 p-2 space-y-1">
                      {availableManagers.map(mgr => (
                        <label key={mgr._id || mgr.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-transparent hover:border-indigo-100 cursor-pointer transition-all shadow-sm">
                          <input
                            type="checkbox"
                            checked={selectedManagerIds.includes(mgr._id || mgr.id)}
                            onChange={(e) => {
                              const val = mgr._id || mgr.id;
                              setSelectedManagerIds(prev => e.target.checked ? [...prev, val] : prev.filter(id => id !== val));
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{mgr.fullName}</p>
                            <p className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-tighter">{mgr.role}</p>
                          </div>
                        </label>
                      ))}
                      {availableManagers.length === 0 && <p className="text-[10px] text-center py-6 text-gray-400 italic font-medium">No managers available</p>}
                    </div>
                    <button
                      onClick={() => handleAssignManagers()}
                      disabled={selectedManagerIds.length === 0 || assigningManagers}
                      className="w-full mt-3 py-2.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all uppercase"
                    >
                      {assigningManagers ? 'Adding...' : 'Assign Leaders'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Workplace Context Card */}
              <div className="bg-gray-900 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-6">Execution Hub</h3>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">Capacity</p>
                      <p className="text-xl font-extrabold">{selectedProject.employees?.length || 0}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">Leadership</p>
                      <p className="text-xl font-extrabold">{selectedProject.projectManagers?.length || 0}</p>
                    </div>
                  </div>
                  <button onClick={closeProjectDetail} className="mt-auto py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/40">
                    Close Workspace
                  </button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // RETURN 2: Project List View
  if (!showForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-3 w-full lg:w-fit min-w-[320px] transition-colors">
              <div className="relative group">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 w-4 h-4 transition-colors" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                />
              </div>
              <div className="mt-2 px-1 flex items-center justify-between">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Showing <span className="font-bold text-gray-900 dark:text-gray-100">{filteredProjects.length}</span> of <span className="font-bold text-gray-900 dark:text-gray-100">{projects.length}</span> projects
                </p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">Clear search</button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-100 dark:shadow-none text-sm font-bold whitespace-nowrap cursor-pointer"
              >
                <FiPlus className="w-5 h-5" />
                <span>Add New Project</span>
              </button>
            </div>
          </div>

          <div className="mt-4">
            {loadingProjects ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 transition-colors">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Loading projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-16 text-center transition-colors">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFolder className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No projects found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                  {searchQuery ? `No projects match \"${searchQuery}\". Try a different search term.` : "Start by creating your first project to manage your workforce."}
                </p>
                {searchQuery ? (
                  <button onClick={() => setSearchQuery('')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Clear search</button>
                ) : (
                  <button onClick={() => { resetForm(); setShowForm(true); }} className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all font-bold shadow-md shadow-indigo-100 dark:shadow-none">Add First Project</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <div
                    key={project._id || project.id}
                    className="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-gray-800 transition-all duration-300 overflow-hidden cursor-pointer"
                    onClick={(e) => { if (!e.target.closest('button')) handleProjectClick(project); }}
                  >
                    <div className="h-1.5 w-full bg-indigo-50 dark:bg-indigo-950/50 group-hover:bg-indigo-500 transition-colors"></div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate pr-2 uppercase" title={project.projectName}>
                            {project.projectName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 tracking-wider uppercase">
                            <FiHash className="w-3 h-3" />
                            <span>{project.projectId}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${getStatusColor(project.status).replace('bg-100', 'bg-50/50')}`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed mb-6 line-clamp-2 h-8">
                        {project.description || "Building excellence through strategic project execution and resource management."}
                      </p>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-50 flex flex-col items-center justify-center transition-colors group-hover:bg-indigo-50/30 group-hover:border-indigo-50">
                          <FiUsers className="w-4 h-4 text-gray-400 mb-1 group-hover:text-indigo-400" />
                          <span className="text-xs font-bold text-gray-900">{project.employees?.length || 0}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Employees</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-50 flex flex-col items-center justify-center transition-colors group-hover:bg-indigo-50/30 group-hover:border-indigo-50">
                          <FiUserCheck className="w-4 h-4 text-gray-400 mb-1 group-hover:text-indigo-400" />
                          <span className="text-xs font-bold text-gray-900">{project.projectManagers?.length || 0}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Managers</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].slice(0, project.employees?.length || 0).map(i => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                              {String.fromCharCode(64 + i)}
                            </div>
                          ))}
                          {project.employees?.length > 3 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                              +{project.employees.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(project._id || project.id); }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          {project.projectName !== 'Ready-to-deploy resources' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(project); }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {deleteConfirmation && (
            <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
                  <p className="text-gray-600 mb-6">Are you sure you want to delete <span className="font-semibold">{deleteConfirmation.projectName}</span> ({deleteConfirmation.projectId})? This action cannot be undone.</p>
                  <div className="flex justify-end gap-3">
                    <button onClick={handleDeleteCancel} disabled={deleting} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                    <button onClick={handleDeleteConfirm} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // RETURN 3: Add/Edit Project Form
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="group p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight uppercase">
                {editingProject ? 'Edit Project Profile' : 'Configure New Project'}
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {editingProject ? `Modifying project ${formData.projectId}` : 'Initialize a new workspace for your team'}
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-xs font-bold flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-6 text-xs font-bold flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 p-1 border-b border-gray-50 pb-3">
                  <FiInfo className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-extrabold text-gray-900 uppercase tracking-widest">General Information</h3>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-1">Project Name <span className="text-red-500">*</span></label>
                  <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} required placeholder="e.g. Apollo Mission Control" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-1">System Reference (ID) <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" name="projectId" value={formData.projectId} onChange={handleChange} required placeholder="PROJ-001" disabled={!!editingProject} className={`w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium ${editingProject ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-1">Lifecycle Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 appearance-none cursor-pointer">
                    <option value="active">ACTIVE</option>
                    <option value="inactive">INACTIVE</option>
                    <option value="completed">COMPLETED</option>
                    <option value="on-hold">ON HOLD</option>
                  </select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 p-1 border-b border-gray-50 pb-3">
                  <FiEdit3 className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-extrabold text-gray-900 uppercase tracking-widest">Project Narrative</h3>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-1">Objective & Scope</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Define objectives..." rows={8} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium resize-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-4">
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-500 text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">Discard</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg">
              {submitting ? 'Securing...' : (editingProject ? 'Save Changes' : 'Initialize Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectManagement
