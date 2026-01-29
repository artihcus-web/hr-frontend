import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FiPlus, FiEdit2, FiTrash2, FiHash, FiX, FiUsers, FiUserCheck, FiUserX, FiFolder, FiSave, FiArrowLeft, FiInfo, FiEdit3, FiSearch, FiFilter, FiBriefcase, FiGrid, FiList, FiDownload } from 'react-icons/fi'
import toast from 'react-hot-toast'
import axiosInstance from '../../../utils/axiosInstance'

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
    status: 'active',
    employees: [],
    projectManagers: []
  })

  const [submitting, setSubmitting] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [availableEmployees, setAvailableEmployees] = useState([])
  const [availableManagers, setAvailableManagers] = useState([])
  // const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false) // Removed: unused
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [selectedManagerIds, setSelectedManagerIds] = useState([])

  const [assigningEmployees, setAssigningEmployees] = useState(false)
  const [assigningManagers, setAssigningManagers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Redesign State
  const [activeTab, setActiveTab] = useState('projects') // 'projects' | 'bench'
  const [benchEmployees, setBenchEmployees] = useState([])
  const [loadingBench, setLoadingBench] = useState(false)
  const [benchSearch, setBenchSearch] = useState('')

  // Create Project Builder State
  const [creationTeamIds, setCreationTeamIds] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [builderSearchQuery, setBuilderSearchQuery] = useState('')
  // const [loadingAllUsers, setLoadingAllUsers] = useState(false) // Removed: unused

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.projectId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter bench employees
  const filteredBench = benchEmployees.filter(emp =>
    (emp.fullName || '').toLowerCase().includes(benchSearch.toLowerCase()) ||
    (emp.email || '').toLowerCase().includes(benchSearch.toLowerCase()) ||
    (emp.role || '').toLowerCase().includes(benchSearch.toLowerCase())
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

        // Filter out "Ready-to-deploy resources" as per user request
        const updatedProjects = fetchedProjects
          .filter(p => p.projectName !== 'Ready-to-deploy resources')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

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

  // Fetch Bench Data (Unassigned Employees)
  const fetchBench = useCallback(async () => {
    if (!token) return
    try {
      setLoadingBench(true)
      // Using axiosInstance based on UserManagement pattern for consistency
      const res = await axiosInstance.get('/api/auth/users')
      const allUsers = res.data.users || []

      // Filter for users who are NOT in any project
      // Note: Backend user object usually has 'assignedProjects' array
      const unassigned = allUsers.filter(u =>
        u.role !== 'admin' &&
        (!u.assignedProjects || u.assignedProjects.length === 0)
      )
      setBenchEmployees(unassigned)
    } catch (error) {
      console.error('Error fetching bench:', error)
      toast.error('Failed to load resource bench')
    } finally {
      setLoadingBench(false)
    }
  }, [token])

  useEffect(() => {
    if (!showForm && token) {
      fetchBench()
    }
  }, [fetchBench, showForm, token])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMultiSelectToggle = (field, id) => {
    setFormData(prev => {
      const current = prev[field] || []
      const exists = current.includes(id)
      return {
        ...prev,
        [field]: exists ? current.filter(item => item !== id) : [...current, id]
      }
    })
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
          status: data.project.status || 'active',
          employees: data.project.employees?.map(e => e._id || e) || [],
          projectManagers: data.project.projectManagers?.map(m => m._id || m) || []
        })

        setEditingProject(projectId)
        setShowForm(true)
        // Ensure we load the full user list for selection
        if (allUsers.length === 0) fetchAllUsers()
      } else {
        toast.error(data.message || 'Failed to load project data')
      }
    } catch {
      toast.error('Network error while loading project data')
    }
  }

  // Handle delete with confirmation
  // const handleDeleteClick = (project) => { // Removed: unused
  //   if (project.projectName === 'Ready-to-deploy resources') {
  //     alert('System Project: "Ready-to-deploy resources" cannot be deleted. It is required for managing unassigned employees.')
  //     return
  //   }
  //   setDeleteConfirmation(project)
  // }

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
    setCreationTeamIds([])
    setBuilderSearchQuery('')
  }

  // Fetch all users for the builder
  const fetchAllUsers = useCallback(async () => {
    if (!token) return
    try {
      // setLoadingAllUsers(true) // Removed unused
      const res = await axiosInstance.get('/api/auth/users')
      // Filter out admins and maybe format them
      const validUsers = (res.data.users || []).filter(u => u.role !== 'admin')
      setAllUsers(validUsers)
    } catch (error) {
      console.error("Failed to fetch users", error)
    } finally {
      // setLoadingAllUsers(false) // Removed unused
    }
  }, [token])

  useEffect(() => {
    if (showForm && !editingProject) {
      fetchAllUsers()
    }
  }, [showForm, editingProject, fetchAllUsers])



  // const filteredBuilderUsers = allUsers.filter(u => // Removed unused
  //   (u.fullName || '').toLowerCase().includes(builderSearchQuery.toLowerCase()) ||
  //   (u.email || '').toLowerCase().includes(builderSearchQuery.toLowerCase())
  // )

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

      // 1. Create/Update Project
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
        const createdProjectId = editingProject ? editingProject : (data.project._id || data.project.id)

        // 2. If Creating NEW project AND team members selected, assign them
        if (!editingProject && creationTeamIds.length > 0 && createdProjectId) {
          setMessage('Project created. Assigning team members...')
          try {
            // Reuse existing assignment endpoint
            await fetch(`${API_URL}/api/projects/${createdProjectId}/assign-employees`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ employeeIds: creationTeamIds })
            })
          } catch (assignErr) {
            console.error("Assignment failed", assignErr)
            toast.error("Project created, but failed to auto-assign team.")
          }
        }

        toast.success(`Project ${editingProject ? 'updated' : 'initialized'} successfully`)
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
      case 'active': return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
      case 'inactive': return 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50'
      case 'completed': return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
      case 'on-hold': return 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    }
  }

  // const handleProjectClick = async (project) => { // Removed: unused
  //   setSelectedProject(project)
  //   setSelectedEmployeeIds([])
  //   setSelectedManagerIds([])
  //   await fetchAvailableUsers(project._id || project.id)
  // }

  const fetchAvailableUsers = async (projectId) => {
    if (!token) return

    try {
      // setLoadingAvailableUsers(true) // Removed unused
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
      // setLoadingAvailableUsers(false)
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



  // const handleRemoveEmployee = async (employeeId) => { // Removed: unused because handleRemoveEmployee (line 475) is reported unused but it IS used in the JSX? Wait, line 475 IS handleRemoveEmployee. It IS duplicated or just not used?
  // checking line 475... function definition
  // checking usages... let me comment it out if lint says so, but usually remove functions are used. Maybe it's used in a sub-component?
  // Ah, the lint error is specific: 475:9 'handleRemoveEmployee'.
  // If I scroll down to JSX, I might find it is NOT used and maybe 'handleRemoveManager' IS used.
  // Wait, line 655 uses `handleRemoveManager`.
  // Line 678 uses `handleAssignManagerMap`.
  // I should check if `handleRemoveEmployee` is used. If lint says no, I'll comment it out.

  // const handleRemoveEmployee = async (employeeId) => {
  //   if (!selectedProject) return
  //
  //   try {
  //     const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  //     const res = await fetch(`${API_URL}/api/projects/${selectedProject._id || selectedProject.id}/employees/${employeeId}`, {
  //       method: 'DELETE',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${token}`
  //       }
  //     })
  //
  //     const data = await res.json()
  //     if (res.ok) {
  //       toast.success('Employee removed successfully')
  //       await fetchProjects(true)
  //       await fetchAvailableUsers(selectedProject._id || selectedProject.id)
  //     } else {
  //       toast.error(data.message || 'Failed to remove employee')
  //     }
  //   } catch {
  //     toast.error('Network error while removing employee')
  //   }
  // }

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Dashboard Style */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <button
                onClick={closeProjectDetail}
                className="group p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                title="Back to Projects"
              >
                <FiArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                    {selectedProject.projectName}
                  </h1>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(selectedProject.status)}`}>
                    {selectedProject.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 shadow-sm">
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
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 overflow-hidden relative group transition-colors">
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
  // RETURN 2: Project List View
  if (!showForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* 1. Header & Tabs Section */}
          <div className="mb-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Project Management</h1>

              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'projects'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                >
                  <FiGrid className="w-4 h-4" />
                  Active Projects
                  <span className={`ml-1 py-0.5 px-2 rounded-full text-xs font-bold ${activeTab === 'projects' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    {projects.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('bench')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'bench'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                >
                  <FiBriefcase className="w-4 h-4" />
                  Resource Bench
                  <span className={`ml-1 py-0.5 px-2 rounded-full text-xs font-bold ${activeTab === 'bench' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    {benchEmployees.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Toolbar */}
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              {/* Search Bar - Separate Card */}
              <div className="relative flex-1 group bg-white dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10 ml-1" />
                </div>
                <input
                  type="text"
                  placeholder={activeTab === 'projects' ? "Search projects..." : "Search bench employees..."}
                  value={activeTab === 'projects' ? searchQuery : benchSearch}
                  onChange={(e) => activeTab === 'projects' ? setSearchQuery(e.target.value) : setBenchSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-0 sm:text-sm"
                />
              </div>

              {activeTab === 'projects' && (
                <div className="flex items-center w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-100 dark:shadow-none text-sm font-bold uppercase tracking-wide whitespace-nowrap"
                  >
                    <FiPlus className="w-5 h-5" />
                    <span>Create New Project</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Content Area */}
          <div className="mt-6">
            {activeTab === 'projects' ? (
              // PROJECTS TAB CONTENT
              <>
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
                      {searchQuery ? `No projects match "${searchQuery}".` : "Start by creating your first project."}
                    </p>
                    <button onClick={() => { resetForm(); setShowForm(true); }} className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold">Add First Project</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                      <div
                        key={project._id || project.id}
                        className="group bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md cursor-default p-4 flex flex-col gap-3"
                      >
                        {/* Header: Icon + Status */}
                        <div className="flex items-center justify-between">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <FiFolder className="w-5 h-5" />
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${getStatusColor(project.status).replace('bg-100', 'bg-50/50')}`}>
                            {project.status}
                          </span>
                        </div>

                        {/* Title & ID */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight" title={project.projectName}>
                            {project.projectName}
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                            {project.projectId}
                          </p>
                        </div>

                        {/* Footer: Counts + Edit */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                          <div className="flex items-center gap-3">
                            {/* Emp Count */}
                            <div className="flex items-center gap-1.5" title="Employees">
                              <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                <FiUsers className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{project.employees?.length || 0}</span>
                            </div>
                            {/* Mgr Count */}
                            <div className="flex items-center gap-1.5" title="Managers">
                              <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                <FiUserCheck className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{project.projectManagers?.length || 0}</span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(project._id || project.id); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            title="Edit Project"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // BENCH TAB CONTENT
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {loadingBench ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-500">Loading bench resources...</p>
                  </div>
                ) : filteredBench.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiUserCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Bench is Empty</h3>
                    <p className="text-gray-500 dark:text-gray-400">All eligible employees are currently assigned to projects.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role & Dept</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredBench.map((emp) => (
                          <tr key={emp._id || emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                  {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">ID: {emp.employeeId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-gray-200">{emp.designation || 'N/A'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{emp.department || 'General'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-gray-200">{emp.email}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{emp.phone}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                                Unassigned
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  // Prompt to assign to a project - for now we can just show a toast or implement a modal
                                  // Ideally, we would open a 'Assign to Project' modal.
                                  // For this iteration, we'll guide them to the project details.
                                  toast('Go to a Project -> Edit -> Add Member to assign this user.', { icon: 'ℹ️' });
                                }}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                              >
                                Deploy
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {deleteConfirmation && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-transparent dark:border-gray-800 transition-colors">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Confirm Delete</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteConfirmation.projectName}</span> ({deleteConfirmation.projectId})? This action cannot be undone.</p>
                  <div className="flex justify-end gap-3">
                    <button onClick={handleDeleteCancel} disabled={deleting} className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">Cancel</button>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${editingProject ? 'w-full max-w-full' : 'max-w-6xl'}`}>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="group p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                {editingProject ? 'Edit Project Profile' : 'Configure New Project'}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
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

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors flex flex-col h-full max-h-[85vh]">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              {/* General Info - Col Span 4 */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <FiInfo className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">General Info</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Name <span className="text-red-500">*</span></label>
                    <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" placeholder="Project Name" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project ID <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                      <input type="text" name="projectId" value={formData.projectId} onChange={handleChange} required disabled={!!editingProject} className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60" placeholder="ID" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20">
                      <option value="active">ACTIVE</option>
                      <option value="inactive">INACTIVE</option>
                      <option value="completed">COMPLETED</option>
                      <option value="on-hold">ON HOLD</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Narrative - Col Span 8 */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <FiEdit3 className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Narrative</h3>
                </div>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Project objective and scope..." className="flex-1 w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm resize-none min-h-[140px]" />
              </div>

            </div>

            {/* Bottom Row: Team Management */}
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
                <FiUsers className="w-4 h-4 text-indigo-500" />
                <h3 className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Team Management</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Managers */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Managers</label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 rounded-full">{formData.projectManagers?.length || 0}</span>
                  </div>
                  <div className="h-40 overflow-y-auto space-y-1 pr-1">
                    {allUsers.filter(u => ['manager', 'hr', 'supermanager'].includes(u.role)).map(user => (
                      <label key={user._id || user.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${(formData.projectManagers || []).includes(user._id || user.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:border-slate-200'
                        }`}>
                        <input type="checkbox" className="rounded text-indigo-600 w-3.5 h-3.5" checked={(formData.projectManagers || []).includes(user._id || user.id)} onChange={() => handleMultiSelectToggle('projectManagers', user._id || user.id)} />
                        <span className="text-xs font-bold truncate flex-1">{user.fullName}</span>
                        <span className="text-[9px] text-slate-400 uppercase">{user.role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Employees */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Team Members</label>
                    <input type="text" placeholder="Search..." value={builderSearchQuery} onChange={e => setBuilderSearchQuery(e.target.value)} className="w-24 px-2 py-0.5 text-[10px] bg-white border rounded focus:outline-none" />
                  </div>
                  <div className="h-40 overflow-y-auto space-y-1 pr-1">
                    {allUsers
                      .filter(u => !['admin', 'manager', 'hr', 'supermanager', 'c-suite'].includes(u.role))
                      .filter(u => u.fullName?.toLowerCase().includes(builderSearchQuery.toLowerCase()))
                      .map(user => (
                        <label key={user._id || user.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${(formData.employees || []).includes(user._id || user.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:border-slate-200'
                          }`}>
                          <input type="checkbox" className="rounded text-indigo-600 w-3.5 h-3.5" checked={(formData.employees || []).includes(user._id || user.id)} onChange={() => handleMultiSelectToggle('employees', user._id || user.id)} />
                          <span className="text-xs font-bold truncate flex-1">{user.fullName}</span>
                          <span className="text-[9px] text-slate-400 truncate max-w-[60px]">{user.designation || 'Emp'}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-8 py-5 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-50 dark:border-gray-800 flex justify-end gap-4 transition-colors">
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="px-6 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Discard</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg">
              {submitting ? 'Securing...' : (editingProject ? 'Save Changes' : 'Initialize Project')}
            </button>
          </div>
        </form>
      </div >
    </div >
  )
}

export default ProjectManagement
