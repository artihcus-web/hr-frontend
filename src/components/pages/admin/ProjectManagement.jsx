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
    projectManagers: [],
    clients: [] // Existing client IDs
  })

  const [submitting, setSubmitting] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [availableEmployees, setAvailableEmployees] = useState([]) // Reformatted to handle all users
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])

  const [assigningEmployees, setAssigningEmployees] = useState(false)
  const [assigningManagers, setAssigningManagers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Redesign State
  const [activeTab, setActiveTab] = useState('projects') // 'projects' | 'bench'
  const [benchEmployees, setBenchEmployees] = useState([])
  const [loadingBench, setLoadingBench] = useState(false)
  const [benchSearch, setBenchSearch] = useState('')
  const [deployMenuOpen, setDeployMenuOpen] = useState(null) // ID of employee whose deploy menu is open
  const [viewingProject, setViewingProject] = useState(null) // Project object for read-only view

  // Create Project Builder State
  const [creationTeamIds, setCreationTeamIds] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [builderSearchQuery, setBuilderSearchQuery] = useState('')
  const [builderSelectedIds, setBuilderSelectedIds] = useState([])

  // Client Management State
  const [clientsData, setClientsData] = useState([]) // For new clients to add
  const [newClient, setNewClient] = useState({ email: '', password: '', name: '' })
  // const [loadingAllUsers, setLoadingAllUsers] = useState(false) // Removed: unused

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.projectId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUpdateHR = async (employeeId, newHR) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

      // Optimistic update
      setBenchEmployees(prev => prev.map(emp =>
        (emp._id === employeeId || emp.id === employeeId) ? { ...emp, businessUnitHR: newHR } : emp
      ))

      await axiosInstance.put(`/api/employees/${employeeId}/assign-hr`, {
        businessUnitHR: newHR
      })

      toast.success(`Assigned to ${newHR}`)
    } catch (error) {
      console.error("Assign HR Error", error)
      toast.error("Failed to update HR assignment")
      // Revert if needed (omitted for simplicity, but could refetch)
    }
  }

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

      // Gather IDs of all users currently assigned to an active project (Employee OR Manager)
      const assignedUserIds = new Set()
      projects.forEach(p => {
        // projects state already excludes 'Ready-to-deploy resources' based on fetchProjects filter
        if (p.employees) {
          p.employees.forEach(e => assignedUserIds.add(typeof e === 'string' ? e : (e._id || e.id)))
        }
        if (p.projectManagers) {
          p.projectManagers.forEach(m => assignedUserIds.add(typeof m === 'string' ? m : (m._id || m.id)))
        }
      })

      // Filter for users who are NOT in any active project AND not restricted roles
      const restrictedRoles = ['admin', 'client', 'c-suite', 'hr'];
      const unassigned = allUsers.filter(u =>
        !restrictedRoles.includes(u.role) &&
        !assignedUserIds.has(u._id || u.id)
      )
      setBenchEmployees(unassigned)
    } catch (error) {
      console.error('Error fetching bench:', error)
      toast.error('Failed to load resource bench')
    } finally {
      setLoadingBench(false)
    }
  }, [token, projects])

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



  const handleBuilderAssign = (role) => {
    // role: 'employees' | 'projectManagers' | null (remove)
    if (builderSelectedIds.length === 0) return

    setFormData(prev => {
      const newEmployees = new Set(prev.employees || [])
      const newManagers = new Set(prev.projectManagers || [])

      builderSelectedIds.forEach(id => {
        // Remove from both first to ensure no duplicates across roles
        newEmployees.delete(id)
        newManagers.delete(id)

        // Add to target role if specified
        if (role === 'employees') newEmployees.add(id)
        if (role === 'projectManagers') newManagers.add(id)
      })

      return {
        ...prev,
        employees: Array.from(newEmployees),
        projectManagers: Array.from(newManagers)
      }
    })
    setBuilderSelectedIds([]) // Clear selection after action
  }

  const handleAddClient = () => {
    if (!newClient.email || !newClient.password) {
      toast.error("Email and Password are required")
      return
    }
    // Simple email validation
    if (!newClient.email.includes('@')) {
      toast.error("Invalid email address")
      return
    }

    setClientsData(prev => [...prev, { ...newClient }])
    setNewClient({ email: '', password: '', name: '' })
  }

  const handleRemoveClient = (index) => {
    setClientsData(prev => prev.filter((_, i) => i !== index))
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
          projectManagers: data.project.projectManagers?.map(m => m._id || m) || [],
          clients: data.project.clients?.map(c => c._id || c) || []
        })

        // Populate existing clients into the list for visual consistency
        // Note: Passwords won't be visible for existing clients, which is expected.
        const existingClients = data.project.clients?.map(c => ({
          _id: c._id || c.id,
          email: c.email,
          name: c.fullName,
          password: '' // Placeholder, won't update unless changed? (Actually, we won't allow pw update this way easily)
        })) || []
        setClientsData(existingClients)

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
      status: 'active',
      clients: []
    })
    setClientsData([])
    setNewClient({ email: '', password: '', name: '' })
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
      const payload = {
        ...formData,
        employees: formData.employees,
        projectManagers: formData.projectManagers, // Ensure these are arrays of IDs
        clientsData: clientsData // Send the full list of client objects (new & existing)
      }

      const res = await fetch(url, {
        method: editingProject ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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
        setAvailableEmployees(data.users || [])
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
        toast.success('Team members assigned successfully')
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

  const handleAssignManagersFromList = async () => {
    if (!selectedProject || selectedEmployeeIds.length === 0) return

    setAssigningManagers(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_URL}/api/projects/${selectedProject._id || selectedProject.id}/assign-managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ managerIds: selectedEmployeeIds })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Project managers assigned successfully')
        setSelectedEmployeeIds([]) // Clear selection main list
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
    setSelectedEmployeeIds([])
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
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Available Resources ({availableEmployees.length})</label>
                    </div>
                    <div className="max-h-96 overflow-y-auto border border-gray-50 rounded-xl bg-gray-50/50 p-2 space-y-1">
                      {availableEmployees.map(user => (
                        <label key={user._id || user.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-transparent hover:border-indigo-100 cursor-pointer transition-all shadow-sm">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.includes(user._id || user.id)}
                            onChange={(e) => {
                              const val = user._id || user.id;
                              setSelectedEmployeeIds(prev => e.target.checked ? [...prev, val] : prev.filter(id => id !== val));
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{user.fullName}</p>
                            <p className="text-[9px] text-gray-400 truncate flex items-center gap-2">
                              <span className='uppercase font-bold bg-gray-100 px-1 py-0.5 rounded text-[8px]'>{user.role}</span>
                              {user.email}
                            </p>
                            {user.currentAssignments && user.currentAssignments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.currentAssignments.map((assign, idx) => (
                                  <span key={idx} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                                    <span className="font-bold max-w-[60px] truncate">{assign.projectName}</span>
                                    <span className="opacity-75 text-[7px] uppercase tracking-wider">({assign.role === 'Manager' ? 'Lead' : 'Mem'})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                      {availableEmployees.length === 0 && <p className="text-[10px] text-center py-6 text-gray-400 italic font-medium">All resources allocated</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={handleAssignEmployees}
                        disabled={selectedEmployeeIds.length === 0 || assigningEmployees || assigningManagers}
                        className="py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold rounded-xl hover:bg-indigo-100 disabled:opacity-50 transition-all uppercase"
                      >
                        {assigningEmployees ? 'Docs...' : 'Assign Member'}
                      </button>
                      <button
                        onClick={handleAssignManagersFromList}
                        disabled={selectedEmployeeIds.length === 0 || assigningEmployees || assigningManagers}
                        className="py-2.5 bg-indigo-600 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 uppercase"
                      >
                        {assigningManagers ? 'Docs...' : 'Assign Manager'}
                      </button>
                    </div>
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
                        onClick={() => setViewingProject(project)}
                        className="group relative bg-sky-50 dark:bg-slate-800/50 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 border border-sky-100 dark:border-slate-700 transition-all duration-300 p-6 flex flex-col gap-4 overflow-hidden cursor-pointer"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                            <FiFolder className="w-6 h-6" />
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>

                        {/* Title & info */}
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate tracking-tight mb-1" title={project.projectName}>
                            {project.projectName}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            <FiHash className="w-3 h-3" />
                            {project.projectId}
                          </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400" title="Employees">
                              <FiUsers className="w-4 h-4" />
                              <span className="text-xs font-bold">{project.employees?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400" title="Managers">
                              <FiUserCheck className="w-4 h-4" />
                              <span className="text-xs font-bold">{project.projectManagers?.length || 0}</span>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => { window.scrollTo(0, 0); handleEdit(project._id || project.id); }}
                              className="flex items-center justify-center w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm relative z-10"
                              title="Edit Project Configuration"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                          </div>
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
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">HR</th>
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
                              <div className="text-sm text-gray-900 dark:text-gray-200">{emp.email}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{emp.phone}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="relative inline-block">
                                <select
                                  value={emp.businessUnitHR || ""}
                                  onChange={(e) => handleUpdateHR(emp._id || emp.id, e.target.value)}
                                  className="appearance-none w-28 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm"
                                >
                                  <option value="" disabled>Select BU</option>
                                  <option value="BU1">BU1</option>
                                  <option value="BU2">BU2</option>
                                  <option value="BU3">BU3</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                                Unassigned
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium relative pr-8">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeployMenuOpen(deployMenuOpen === (emp._id || emp.id) ? null : (emp._id || emp.id))
                                  }}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center gap-1 ml-auto"
                                >
                                  Deploy
                                </button>

                                {deployMenuOpen === (emp._id || emp.id) && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setDeployMenuOpen(null)}></div>
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-20 py-1 max-h-60 overflow-y-auto">
                                      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <p className="text-[10px] uppercase font-bold text-gray-400">Select Project</p>
                                      </div>
                                      {projects.filter(p => p.status === 'active').length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-gray-400 italic text-center">No active projects</div>
                                      ) : (
                                        projects.filter(p => p.status === 'active').map(project => (
                                          <button
                                            key={project._id || project.id}
                                            onClick={() => {
                                              // 1. Close Menu
                                              setDeployMenuOpen(null);
                                              // 2. Pre-select this employee in the builder (so they are checked when form opens)
                                              setBuilderSelectedIds([emp._id || emp.id]);
                                              // 3. Open the project in edit mode (this will load project data)
                                              // We need to wait for edit data to load, then we might need to manually ensure this ID is added if handleEdit wipes state?
                                              // handleEdit sets editingProject and showForm.
                                              // However, handleEdit loads data from API which might overwrite builderSelectedIds or not use it.
                                              // Let's modify handleEdit logic or just use a tailored flow.
                                              // Actually, `handleBuilderAssign` logic works on `builderSelectedIds`.
                                              // If we open form, `builderSelectedIds` is separate from `formData.employees`.
                                              // So we can: Open Form -> User sees "Team Management" list. 
                                              // We want this user to be 'checked' in that list immediately?
                                              // `builderSelectedIds` controls the checkboxes in the "Team Management" list!
                                              // So yes, setting it here works perfectly.
                                              handleEdit(project._id || project.id);
                                              // 4. Toast
                                              toast.success(`Redirecting to assigned ${project.projectName}`);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 flex items-center justify-between group"
                                          >
                                            <span className="truncate max-w-[140px] font-medium">{project.projectName}</span>
                                            <span className="text-[9px] text-gray-400 group-hover:text-indigo-400">{project.projectId}</span>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
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

          {/* VIEW PROJECT MODAL */}
          {viewingProject && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingProject(null)}>
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <FiFolder className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{viewingProject.projectName}</h2>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                        <FiHash className="w-3 h-3" />
                        {viewingProject.projectId}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setViewingProject(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <FiX className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">

                  {/* Status Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(viewingProject.status)}`}>
                        {viewingProject.status}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Created At</label>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {new Date(viewingProject.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Team Section */}
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FiUsers className="w-4 h-4 text-indigo-500" />
                      Team Composition
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Managers */}
                      {viewingProject.projectManagers?.map((mgr, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                            {typeof mgr === 'string' ? 'M' : (mgr.firstName?.[0] || 'M')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-purple-900 dark:text-purple-100">{typeof mgr === 'string' ? 'Manager' : mgr.fullName}</p>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Project Lead</p>
                          </div>
                        </div>
                      ))}
                      {/* Employees */}
                      {viewingProject.employees?.map((emp, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold">
                            {typeof emp === 'string' ? 'E' : (emp.firstName?.[0] || 'E')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{typeof emp === 'string' ? 'Employee' : emp.fullName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member</p>
                          </div>
                        </div>
                      ))}
                      {(viewingProject.projectManagers?.length === 0 && viewingProject.employees?.length === 0) && (
                        <div className="col-span-full py-4 text-center text-xs text-slate-400 italic">No team members assigned.</div>
                      )}
                    </div>
                  </div>

                  {/* Clients Section */}
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FiUserCheck className="w-4 h-4 text-emerald-500" />
                      Client Access
                    </h3>
                    <div className="space-y-2">
                      {viewingProject.clients?.length > 0 ? (
                        viewingProject.clients.map((client, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                {client.firstName?.[0] || client.name?.[0] || 'C'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">{client.name || client.fullName || 'Client'}</p>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{client.email}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">No clients have access.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
                  <button onClick={() => setViewingProject(null)} className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all">Close</button>
                  <button
                    onClick={() => { setViewingProject(null); handleEdit(viewingProject._id || viewingProject.id); }}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                  >
                    <FiEdit2 className="w-4 h-4" /> Edit Project
                  </button>
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
              {/* Client Access - Col Span 8 */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <FiUsers className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Client Access</h3>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col h-full">
                  {/* Add Client Inputs */}
                  <div className="grid grid-cols-12 gap-3 mb-4">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Client Name (Optional)"
                        value={newClient.name || ''}
                        onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="col-span-7">
                      <input
                        type="email"
                        placeholder="Email Address *"
                        value={newClient.email || ''}
                        onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="col-span-8">
                      <input
                        type="password"
                        placeholder="Password *"
                        value={newClient.password || ''}
                        onChange={e => setNewClient(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="col-span-4">
                      <button
                        type="button"
                        onClick={handleAddClient}
                        className="w-full h-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        Add Client
                      </button>
                    </div>
                  </div>

                  {/* Client List */}
                  <div className="flex-1 min-h-[100px] overflow-y-auto space-y-2 pr-1">
                    {clientsData.length === 0 ? (
                      <p className="text-center text-[10px] text-gray-400 italic py-4">No clients assigned to this project.</p>
                    ) : (
                      clientsData.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold shrink-0">
                              {client.name ? client.name[0] : (client.email ? client.email[0].toUpperCase() : 'C')}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{client.name || 'Client'}</p>
                              <p className="text-[9px] text-slate-500 truncate">{client.email}</p>
                              {client._id && <span className="text-[8px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">Existing</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveClient(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Team Management */}
            {/* Bottom Row: Team Management (Unified Builder) */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Team Management</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{allUsers.length} Resources</span>
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={builderSearchQuery}
                    onChange={e => setBuilderSearchQuery(e.target.value)}
                    className="w-40 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                {/* Action Bar */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => handleBuilderAssign('employees')}
                    disabled={builderSelectedIds.length === 0}
                    className="px-4 py-2 bg-white border border-slate-200 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Assign Member
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuilderAssign('projectManagers')}
                    disabled={builderSelectedIds.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Assign Manager
                  </button>
                  {/* Optional: Unassign Button */}
                  <button
                    type="button"
                    onClick={() => handleBuilderAssign(null)}
                    disabled={builderSelectedIds.length === 0}
                    className="ml-auto px-4 py-2 bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* Unified List */}
                <div className="h-64 overflow-y-auto space-y-1 pr-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-2">
                  {allUsers
                    .filter(u => u.fullName?.toLowerCase().includes(builderSearchQuery.toLowerCase()) || u.email?.toLowerCase().includes(builderSearchQuery.toLowerCase()))
                    .map(user => {
                      const isManager = (formData.projectManagers || []).includes(user._id || user.id);
                      const isEmployee = (formData.employees || []).includes(user._id || user.id);
                      const isSelected = builderSelectedIds.includes(user._id || user.id);

                      return (
                        <label key={user._id || user.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'hover:bg-slate-50 border-transparent border-b-slate-50'
                          } ${isManager || isEmployee ? 'bg-slate-50/30' : ''}`}>

                          <input
                            type="checkbox"
                            className="rounded text-indigo-600 w-4 h-4"
                            checked={isSelected}
                            onChange={(e) => {
                              const id = user._id || user.id
                              setBuilderSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id))
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{user.fullName}</span>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{user.role}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{user.email}</div>

                            {user.currentAssignments && user.currentAssignments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.currentAssignments.map((assign, idx) => (
                                  <span key={idx} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                                    <span className="font-bold max-w-[60px] truncate">{assign.projectName}</span>
                                    <span className="opacity-75 text-[7px] uppercase tracking-wider">({assign.role === 'Manager' ? 'Lead' : 'Mem'})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div>
                            {isManager && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[9px] font-bold uppercase tracking-wider rounded-md">Manager</span>}
                            {isEmployee && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-wider rounded-md">Member</span>}
                            {!isManager && !isEmployee && <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider rounded-md opacity-50">Unassigned</span>}
                          </div>
                        </label>
                      )
                    })}
                  {allUsers.length === 0 && <p className="text-center py-10 text-xs text-gray-400 italic">No users available.</p>}
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

        {/* VIEW PROJECT MODAL */}
        {viewingProject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingProject(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-8 py-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <FiFolder className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{viewingProject.projectName}</h2>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                      <FiHash className="w-3 h-3" />
                      {viewingProject.projectId}
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewingProject(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <FiX className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">

                {/* Status Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(viewingProject.status)}`}>
                      {viewingProject.status}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Created At</label>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {new Date(viewingProject.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Team Section */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FiUsers className="w-4 h-4 text-indigo-500" />
                    Team Composition
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Managers */}
                    {viewingProject.projectManagers?.map((mgr, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                          {typeof mgr === 'string' ? 'M' : (mgr.firstName?.[0] || 'M')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-purple-900 dark:text-purple-100">{typeof mgr === 'string' ? 'Manager' : mgr.fullName}</p>
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Project Lead</p>
                        </div>
                      </div>
                    ))}
                    {/* Employees */}
                    {viewingProject.employees?.map((emp, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold">
                          {typeof emp === 'string' ? 'E' : (emp.firstName?.[0] || 'E')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{typeof emp === 'string' ? 'Employee' : emp.fullName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member</p>
                        </div>
                      </div>
                    ))}
                    {(viewingProject.projectManagers?.length === 0 && viewingProject.employees?.length === 0) && (
                      <div className="col-span-full py-4 text-center text-xs text-slate-400 italic">No team members assigned.</div>
                    )}
                  </div>
                </div>

                {/* Clients Section */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FiUserCheck className="w-4 h-4 text-emerald-500" />
                    Client Access
                  </h3>
                  <div className="space-y-2">
                    {viewingProject.clients?.length > 0 ? (
                      viewingProject.clients.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                              {client.firstName?.[0] || client.name?.[0] || 'C'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">{client.name || client.fullName || 'Client'}</p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{client.email}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No clients have access.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
                <button onClick={() => setViewingProject(null)} className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all">Close</button>
                <button
                  onClick={() => { setViewingProject(null); handleEdit(viewingProject._id || viewingProject.id); }}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                >
                  <FiEdit2 className="w-4 h-4" /> Edit Project
                </button>
              </div>

            </div>
          </div>
        )}
      </div >
    </div >
  )
}

export default ProjectManagement
