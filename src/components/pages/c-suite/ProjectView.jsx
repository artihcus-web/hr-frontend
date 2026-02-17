import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { FiUsers, FiFolder, FiCheckCircle, FiClock, FiAlertCircle, FiX } from 'react-icons/fi'
import toast from '../../../utils/toast'
import { getProfileImageUrl } from '../../../config/apiConfig'

function ProjectView() {
    const { token } = useAuth()
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [benchProject, setBenchProject] = useState(null)
    const [activeProjects, setActiveProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState(null)

    const fetchProjects = React.useCallback(async () => {
        try {
            setLoading(true)
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
            const res = await fetch(`${API_URL}/api/projects`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()

            if (res.ok) {
                const allProjects = data.projects || []
                const bench = allProjects.find(p => p.projectName === 'Ready-to-deploy resources')
                const others = allProjects.filter(p => p.projectName !== 'Ready-to-deploy resources')

                setBenchProject(bench)
                setActiveProjects(others)
                setProjects(allProjects)
            } else {
                toast.error('Failed to fetch project data')
            }
        } catch (error) {
            console.error('Error fetching projects:', error)
            toast.error('Network error')
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setSelectedProject(null)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    const getInitials = (name) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }

    const getRandomColor = (name) => {
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500']
        let hash = 0
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
        return colors[Math.abs(hash) % colors.length]
    }

    // Calculate unique employees count
    const uniqueEmployees = new Set()
    projects.forEach(p => {
        p.employees?.forEach(e => {
            uniqueEmployees.add(e._id || e.id)
        })
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header & Stats - Compact */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Project View</h1>
                        <p className="text-xs text-gray-500">Resource allocation & project status</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                                <FiUsers size={16} />
                            </div>
                            <div>
                                <span className="block text-lg font-bold text-gray-900 leading-none">{uniqueEmployees.size}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Total Employees</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-gray-100"></div>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-50 rounded text-green-600">
                                <FiFolder size={16} />
                            </div>
                            <div>
                                <span className="block text-lg font-bold text-gray-900 leading-none">{activeProjects.length}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Projects</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bench Section - High Density */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <FiClock className="text-orange-500" size={16} />
                            <h2 className="text-sm font-bold text-gray-800">Ready to Deploy</h2>
                            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                                {benchProject?.employees?.length || 0}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 italic">Unassigned resources</span>
                    </div>

                    <div className="p-3 bg-gray-50/30">
                        {benchProject?.employees?.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                {benchProject.employees.map(emp => (
                                    <div key={emp._id || emp.id} className="flex items-center gap-2 p-1.5 rounded border border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-colors h-9">
                                        {emp.profileImage ? (
                                            <img
                                                src={getProfileImageUrl(emp.profileImage, emp._id || emp.id)}
                                                alt={emp.fullName || emp.username || 'User'}
                                                className="h-6 w-6 rounded-full flex-shrink-0 object-cover border border-gray-200"
                                                onError={(e) => {
                                                    e.target.style.display = 'none'
                                                    const parent = e.target.parentElement
                                                    if (parent && !parent.querySelector('.avatar-fallback')) {
                                                        const fallback = document.createElement('div')
                                                        fallback.className = `avatar-fallback h-6 w-6 rounded-full flex-shrink-0 ${getRandomColor(emp.fullName || emp.username)} flex items-center justify-center text-white text-[9px] font-bold`
                                                        fallback.textContent = getInitials(emp.fullName || emp.username)
                                                        parent.appendChild(fallback)
                                                    }
                                                }}
                                            />
                                        ) : null}
                                        {(!emp.profileImage || !getProfileImageUrl(emp.profileImage, emp._id || emp.id)) && (
                                            <div className={`h-6 w-6 rounded-full flex-shrink-0 ${getRandomColor(emp.fullName || emp.username)} flex items-center justify-center text-white text-[9px] font-bold avatar-fallback`}>
                                                {getInitials(emp.fullName || emp.username)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1 leading-tight">
                                            <p className="text-[11px] font-semibold text-gray-900 truncate" title={emp.fullName || emp.username}>
                                                {emp.fullName || emp.username}
                                            </p>
                                            <p className="text-[9px] text-gray-400 truncate" title={emp.email}>
                                                {emp.email}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-gray-400 text-xs italic">
                                All resources are currently deployed.
                            </div>
                        )}
                    </div>
                </section>

                {/* Active Projects Grid */}
                <section>
                    <h2 className="text-sm font-bold text-gray-800 mb-3 px-1">Active Projects ({activeProjects.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {activeProjects.map(project => (
                            <div
                                key={project._id || project.id}
                                onClick={() => setSelectedProject(project)}
                                className="bg-white rounded border border-gray-200 p-3 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-gray-900 text-sm truncate pr-2 flex-1" title={project.projectName}>
                                        {project.projectName}
                                    </h3>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${project.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' :
                                        project.status === 'on-hold' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                            'bg-gray-50 text-gray-600 border border-gray-100'
                                        }`}>
                                        {project.status}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
                                    <span>Manager: <span className="font-medium text-gray-700">{project.projectManagers?.[0]?.fullName || 'Unassigned'}</span></span>
                                    <span>Team: <span className="font-medium text-gray-700">{project.employees?.length || 0}</span></span>
                                </div>

                                <div className="flex -space-x-1.5 overflow-hidden py-1">
                                    {project.employees?.slice(0, 6).map(emp => (
                                        emp.profileImage ? (
                                            <img
                                                key={emp._id || emp.id}
                                                src={getProfileImageUrl(emp.profileImage, emp._id || emp.id)}
                                                alt={emp.fullName || emp.username || 'User'}
                                                className="h-5 w-5 rounded-full ring-1 ring-white object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none'
                                                    const parent = e.target.parentElement
                                                    if (parent && !parent.querySelector(`.avatar-fallback-${emp._id || emp.id}`)) {
                                                        const fallback = document.createElement('div')
                                                        fallback.className = `avatar-fallback-${emp._id || emp.id} h-5 w-5 rounded-full ring-1 ring-white ${getRandomColor(emp.fullName || emp.username)} flex items-center justify-center text-white text-[8px] font-bold`
                                                        fallback.textContent = getInitials(emp.fullName || emp.username)
                                                        parent.appendChild(fallback)
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div key={emp._id || emp.id} className={`h-5 w-5 rounded-full ring-1 ring-white ${getRandomColor(emp.fullName || emp.username)} flex items-center justify-center text-white text-[8px] font-bold avatar-fallback-${emp._id || emp.id}`}>
                                                {getInitials(emp.fullName || emp.username)}
                                            </div>
                                        )
                                    ))}
                                    {project.employees?.length > 6 && (
                                        <div className="h-5 w-5 rounded-full ring-1 ring-white bg-gray-100 flex items-center justify-center text-gray-500 text-[8px] font-bold border border-gray-200">
                                            +{project.employees.length - 6}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Compact Details Modal */}
                {selectedProject && (
                    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col pt-0 animate-in fade-in zoom-in duration-150">

                            {/* Modal Header */}
                            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        {selectedProject.projectName}
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${selectedProject.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                                            }`}>
                                            {selectedProject.status}
                                        </span>
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelectedProject(null)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-5 space-y-5 custom-scrollbar">
                                {/* Managers */}
                                {selectedProject.projectManagers?.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Managers</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {selectedProject.projectManagers.map(mgr => (
                                                <div key={mgr._id || mgr.id} className="flex items-center gap-2 p-2 bg-indigo-50/50 border border-indigo-100 rounded">
                                                    {mgr.profileImage ? (
                                                        <img
                                                            src={getProfileImageUrl(mgr.profileImage, mgr._id || mgr.id)}
                                                            alt={mgr.fullName || mgr.username || 'User'}
                                                            className="h-8 w-8 rounded-full object-cover border border-indigo-200"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none'
                                                                const parent = e.target.parentElement
                                                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                                                    const fallback = document.createElement('div')
                                                                    fallback.className = `avatar-fallback h-8 w-8 rounded-full ${getRandomColor(mgr.fullName || mgr.username)} flex items-center justify-center text-white text-[10px] font-bold`
                                                                    fallback.textContent = getInitials(mgr.fullName || mgr.username)
                                                                    parent.appendChild(fallback)
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    {(!mgr.profileImage || !getProfileImageUrl(mgr.profileImage, mgr._id || mgr.id)) && (
                                                        <div className={`h-8 w-8 rounded-full ${getRandomColor(mgr.fullName || mgr.username)} flex items-center justify-center text-white text-[10px] font-bold avatar-fallback`}>
                                                            {getInitials(mgr.fullName || mgr.username)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-semibold text-gray-900 truncate">{mgr.fullName || mgr.username}</div>
                                                        <div className="text-[10px] text-indigo-600 truncate">{mgr.email}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Employees */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Assigned Team ({selectedProject.employees?.length || 0})
                                        </h3>
                                    </div>

                                    {selectedProject.employees?.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {selectedProject.employees.map(emp => (
                                                <div key={emp._id || emp.id} className="flex items-center gap-2 p-1.5 border border-gray-100 rounded hover:border-gray-300 transition-colors bg-white">
                                                    {emp.profileImage ? (
                                                        <img
                                                            src={getProfileImageUrl(emp.profileImage, emp._id || emp.id)}
                                                            alt={emp.fullName || emp.username || 'User'}
                                                            className="h-7 w-7 rounded-full flex-shrink-0 object-cover border border-gray-200"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none'
                                                                const parent = e.target.parentElement
                                                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                                                    const fallback = document.createElement('div')
                                                                    fallback.className = `avatar-fallback h-7 w-7 rounded-full flex-shrink-0 ${getRandomColor(emp.fullName || emp.username)} flex items-center justify-center text-white text-[9px] font-bold`
                                                                    fallback.textContent = getInitials(emp.fullName || emp.username)
                                                                    parent.appendChild(fallback)
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    {(!emp.profileImage || !getProfileImageUrl(emp.profileImage, emp._id || emp.id)) && (
                                                        <div className={`h-7 w-7 rounded-full flex-shrink-0 ${getRandomColor(emp.fullName || emp.username)} flex items-center justify-center text-white text-[9px] font-bold avatar-fallback`}>
                                                            {getInitials(emp.fullName || emp.username)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-medium text-gray-900 truncate" title={emp.fullName}>{emp.fullName || emp.username}</div>
                                                        <div className="text-[9px] text-gray-400 truncate -mt-0.5" title={emp.email}>{emp.email}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-200">
                                            <p className="text-xs text-gray-400">No team members assigned.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProjectView
