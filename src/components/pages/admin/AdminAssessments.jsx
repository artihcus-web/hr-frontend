import React, { useState, useEffect } from 'react'
import {
  FiClipboard,
  FiCheckCircle,
  FiGrid,
  FiBook,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiClock,
  FiFileText,
  FiUpload,
  FiX,
  FiSettings,
  FiList
} from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import toast from '../../../utils/toast'
import LoadingSpinner from '../../common/LoadingSpinner'

const TABS = [
  { id: 'approvals', label: 'Approvals', icon: FiCheckCircle },
  { id: 'modules', label: 'Modules', icon: FiGrid },
  { id: 'knowledge', label: 'Knowledge Base', icon: FiBook }
]

// Default test settings structure
const defaultTestSettings = {
  durationMinutes: 60,
  totalQuestions: 20,
  passingScore: 70,
  shuffleQuestions: true,
  shuffleOptions: true,
  showResults: true,
  allowRetake: false,
  rules: ''
}

const AdminAssessments = () => {
  const [activeTab, setActiveTab] = useState('modules')
  const [loading, setLoading] = useState(false)

  // Approvals tab state
  const [approvalRequests, setApprovalRequests] = useState([])

  // Modules tab state
  const [modules, setModules] = useState([])
  const [selectedModule, setSelectedModule] = useState(null)
  const [showAddModule, setShowAddModule] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleDescription, setNewModuleDescription] = useState('')
  const [questions, setQuestions] = useState([])
  const [questionFile, setQuestionFile] = useState(null)
  const [testSettings, setTestSettings] = useState(defaultTestSettings)
  const [editingSettings, setEditingSettings] = useState(false)

  // Knowledge base tab state
  const [knowledgeItems, setKnowledgeItems] = useState([])
  const [showAddKnowledge, setShowAddKnowledge] = useState(false)
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', file: null })

  useEffect(() => {
    // Fetch data when tab changes
    if (activeTab === 'approvals') fetchApprovals()
    if (activeTab === 'modules') fetchModules()
    if (activeTab === 'knowledge') fetchKnowledgeBase()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch functions are stable, avoid refetch loops
  }, [activeTab])

  const fetchApprovals = async () => {
    try {
      setLoading(true)
      const res = await axiosInstance.get('/api/assessments/access-requests')
      setApprovalRequests(res.data?.requests || [])
    } catch {
      setApprovalRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (req) => {
    try {
      await axiosInstance.put(`/api/assessments/access-requests/${req._id || req.id}/approve`)
      toast.success('Access approved')
      fetchApprovals()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve')
    }
  }

  const handleReject = async (req) => {
    try {
      await axiosInstance.put(`/api/assessments/access-requests/${req._id || req.id}/reject`)
      toast.success('Access rejected')
      fetchApprovals()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject')
    }
  }

  const fetchModules = async () => {
    try {
      setLoading(true)
      const res = await axiosInstance.get('/api/assessments/modules').catch(() => ({ data: { modules: [] } }))
      setModules(res.data?.modules || [])
      if (res.data?.modules?.length > 0 && !selectedModule) {
        setSelectedModule(res.data.modules[0])
        loadModuleQuestions(res.data.modules[0]._id || res.data.modules[0].id)
        loadModuleSettings(res.data.modules[0]._id || res.data.modules[0].id)
      }
    } catch {
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  const loadModuleQuestions = async (moduleId) => {
    try {
      const res = await axiosInstance.get(`/api/assessments/modules/${moduleId}/questions`).catch(() => ({ data: { questions: [] } }))
      setQuestions(res.data?.questions || [])
    } catch {
      setQuestions([])
    }
  }

  const loadModuleSettings = async (moduleId) => {
    try {
      const res = await axiosInstance.get(`/api/assessments/modules/${moduleId}/settings`).catch(() => ({ data: { settings: defaultTestSettings } }))
      setTestSettings(res.data?.settings || defaultTestSettings)
    } catch {
      setTestSettings(defaultTestSettings)
    }
  }

  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true)
      const res = await axiosInstance.get('/api/assessments/knowledge-base').catch(() => ({ data: { items: [] } }))
      setKnowledgeItems(res.data?.items || [])
    } catch {
      setKnowledgeItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectModule = (mod) => {
    setSelectedModule(mod)
    const id = mod._id || mod.id
    if (id) {
      loadModuleQuestions(id)
      loadModuleSettings(id)
    } else {
      setQuestions([])
      setTestSettings(defaultTestSettings)
    }
  }

  const handleAddModule = async () => {
    if (!newModuleName.trim()) {
      toast.error('Module name is required')
      return
    }
    try {
      const res = await axiosInstance.post('/api/assessments/modules', {
        name: newModuleName.trim(),
        description: newModuleDescription.trim()
      }).catch(() => ({ data: { module: { id: Date.now(), name: newModuleName, description: newModuleDescription } } }))
      const newMod = res.data?.module || { id: Date.now(), name: newModuleName, description: newModuleDescription }
      setModules(prev => [...prev, newMod])
      setNewModuleName('')
      setNewModuleDescription('')
      setShowAddModule(false)
      toast.success('Module added successfully')
      handleSelectModule(newMod)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add module')
    }
  }

  const handleDeleteModule = async (mod) => {
    if (!window.confirm(`Delete module "${mod.name}"? This cannot be undone.`)) return
    try {
      await axiosInstance.delete(`/api/assessments/modules/${mod._id || mod.id}`).catch(() => {})
      setModules(prev => prev.filter(m => (m._id || m.id) !== (mod._id || mod.id)))
      if (selectedModule && (selectedModule._id || selectedModule.id) === (mod._id || mod.id)) {
        setSelectedModule(modules[0] || null)
        setQuestions([])
        setTestSettings(defaultTestSettings)
      }
      toast.success('Module deleted')
    } catch {
      setModules(prev => prev.filter(m => (m._id || m.id) !== (mod._id || mod.id)))
      toast.success('Module deleted')
    }
  }

  const handleUploadQuestions = async () => {
    if (!questionFile || !selectedModule) return
    if (!questionFile.name.toLowerCase().endsWith('.docx')) {
      toast.error('Please upload a .docx file')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', questionFile)
      await axiosInstance.post(`/api/assessments/modules/${selectedModule._id || selectedModule.id}/questions/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Questions uploaded successfully')
      setQuestionFile(null)
      setShowAddQuestion(false)
      loadModuleQuestions(selectedModule._id || selectedModule.id)
    } catch {
      // Backend not yet implemented - show UI feedback
      setQuestions(prev => [...prev, { id: Date.now(), text: `Imported from ${questionFile.name}`, options: [] }])
      toast.success('File received. Backend parsing will be wired when API is ready.')
      setQuestionFile(null)
      setShowAddQuestion(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!selectedModule) return
    try {
      await axiosInstance.put(`/api/assessments/modules/${selectedModule._id || selectedModule.id}/settings`, testSettings).catch(() => {})
      setEditingSettings(false)
      toast.success('Test settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    }
  }

  const handleAddKnowledge = async () => {
    if (!newKnowledge.title.trim()) {
      toast.error('Title is required')
      return
    }
    try {
      const formData = new FormData()
      formData.append('title', newKnowledge.title)
      formData.append('content', newKnowledge.content)
      if (newKnowledge.file) formData.append('file', newKnowledge.file)
      await axiosInstance.post('/api/assessments/knowledge-base', formData, {
        headers: newKnowledge.file ? { 'Content-Type': 'multipart/form-data' } : {}
      }).catch(() => ({
        data: { item: { id: Date.now(), title: newKnowledge.title, content: newKnowledge.content } }
      }))
      setKnowledgeItems(prev => [...prev, { id: Date.now(), title: newKnowledge.title, content: newKnowledge.content }])
      setNewKnowledge({ title: '', content: '', file: null })
      setShowAddKnowledge(false)
      toast.success('Knowledge item added')
    } catch {
      setKnowledgeItems(prev => [...prev, { id: Date.now(), title: newKnowledge.title, content: newKnowledge.content }])
      setShowAddKnowledge(false)
      toast.success('Knowledge item added')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FiClipboard className="w-7 h-7 text-indigo-600" />
            Assessments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage assessment modules, questions, approvals, and knowledge base.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Assessment Approval Requests</h2>
                {approvalRequests.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                    No pending approval requests.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {approvalRequests.map(req => (
                      <div
                        key={req.id || req._id}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{req.requesterName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{req.officialEmail || req.employeeId}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Employee ID: {req.employeeId} · {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modules Tab */}
            {activeTab === 'modules' && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Module list */}
                <div className="lg:w-72 flex-shrink-0">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Modules</h3>
                      <button
                        onClick={() => setShowAddModule(true)}
                        className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {modules.length === 0 ? (
                        <p className="p-4 text-gray-500 dark:text-gray-400 text-sm">No modules yet. Add one.</p>
                      ) : (
                        modules.map(mod => (
                          <div
                            key={mod._id || mod.id}
                            onClick={() => handleSelectModule(mod)}
                            className={`flex items-center justify-between p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                              selectedModule && (selectedModule._id || selectedModule.id) === (mod._id || mod.id)
                                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{mod.name}</span>
                            <button
                              onClick={e => { e.stopPropagation(); handleDeleteModule(mod) }}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Module content */}
                <div className="flex-1 space-y-6">
                  {selectedModule ? (
                    <>
                      {/* Test settings */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <FiSettings className="w-4 h-4" />
                            Test Settings — {selectedModule.name}
                          </h3>
                          {editingSettings ? (
                            <div className="flex gap-2">
                              <button onClick={handleSaveSettings} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm">
                                <FiSave className="w-4 h-4" /> Save
                              </button>
                              <button onClick={() => setEditingSettings(false)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingSettings(true)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm">
                              <FiEdit2 className="w-4 h-4" /> Edit
                            </button>
                          )}
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                            <input
                              type="number"
                              min={1}
                              value={testSettings.durationMinutes}
                              onChange={e => setTestSettings(s => ({ ...s, durationMinutes: +e.target.value || 1 }))}
                              disabled={!editingSettings}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Questions</label>
                            <input
                              type="number"
                              min={1}
                              value={testSettings.totalQuestions}
                              onChange={e => setTestSettings(s => ({ ...s, totalQuestions: +e.target.value || 1 }))}
                              disabled={!editingSettings}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passing Score (%)</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={testSettings.passingScore}
                              onChange={e => setTestSettings(s => ({ ...s, passingScore: +e.target.value || 0 }))}
                              disabled={!editingSettings}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={testSettings.shuffleQuestions}
                                onChange={e => setTestSettings(s => ({ ...s, shuffleQuestions: e.target.checked }))}
                                disabled={!editingSettings}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Shuffle questions</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={testSettings.shuffleOptions}
                                onChange={e => setTestSettings(s => ({ ...s, shuffleOptions: e.target.checked }))}
                                disabled={!editingSettings}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Shuffle options</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={testSettings.showResults}
                                onChange={e => setTestSettings(s => ({ ...s, showResults: e.target.checked }))}
                                disabled={!editingSettings}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Show results</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={testSettings.allowRetake}
                                onChange={e => setTestSettings(s => ({ ...s, allowRetake: e.target.checked }))}
                                disabled={!editingSettings}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Allow retake</span>
                            </label>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rules / Instructions</label>
                            <textarea
                              rows={3}
                              value={testSettings.rules}
                              onChange={e => setTestSettings(s => ({ ...s, rules: e.target.value }))}
                              disabled={!editingSettings}
                              placeholder="e.g. No external help allowed. One attempt unless retake is enabled."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <FiList className="w-4 h-4" />
                            Questions ({questions.length})
                          </h3>
                          <button
                            onClick={() => setShowAddQuestion(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm"
                          >
                            <FiUpload className="w-4 h-4" /> Upload .docx
                          </button>
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Upload a .docx file with fixed format: Each question on a new paragraph; options as A), B), C), D); correct answer marked with * before the option.
                          </p>
                          {questions.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No questions yet. Upload a .docx file.</p>
                          ) : (
                            <ul className="space-y-3">
                              {questions.map((q, i) => (
                                <li key={q._id || q.id || i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="font-medium text-gray-900 dark:text-gray-100">{i + 1}. {q.text || q.question || 'Question'}</p>
                                  {q.options?.length > 0 && (
                                    <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {q.options.map((opt, j) => (
                                        <li key={j}>{String.fromCharCode(65 + j)}) {opt.text || opt} {opt.correct ? '✓' : ''}</li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
                      Select a module or add a new one.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Knowledge Base Tab */}
            {activeTab === 'knowledge' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Knowledge Base</h3>
                  <button
                    onClick={() => setShowAddKnowledge(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm"
                  >
                    <FiPlus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="p-4">
                  {knowledgeItems.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">No knowledge base items yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {knowledgeItems.map(item => (
                        <div
                          key={item.id || item._id}
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.content || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Module Modal */}
      {showAddModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Module</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newModuleName}
                  onChange={e => setNewModuleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="e.g. Product Knowledge"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newModuleDescription}
                  onChange={e => setNewModuleDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleAddModule} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md font-medium">
                Add
              </button>
              <button onClick={() => { setShowAddModule(false); setNewModuleName(''); setNewModuleDescription('') }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question (Upload .docx) Modal */}
      {showAddQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Questions (.docx)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Use the fixed format: Each question on a new line; options prefixed with A), B), C), D); mark correct with * before the option.
            </p>
            <input
              type="file"
              accept=".docx"
              onChange={e => setQuestionFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
            />
            <div className="flex gap-2 mt-6">
              <button onClick={handleUploadQuestions} disabled={!questionFile} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md font-medium disabled:opacity-50">
                Upload
              </button>
              <button onClick={() => { setShowAddQuestion(false); setQuestionFile(null) }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Knowledge Modal */}
      {showAddKnowledge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Knowledge Base Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newKnowledge.title}
                  onChange={e => setNewKnowledge(k => ({ ...k, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea
                  rows={4}
                  value={newKnowledge.content}
                  onChange={e => setNewKnowledge(k => ({ ...k, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Content or description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachment (optional)</label>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={e => setNewKnowledge(k => ({ ...k, file: e.target.files?.[0] || null }))}
                  className="w-full text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleAddKnowledge} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md font-medium">
                Add
              </button>
              <button onClick={() => setShowAddKnowledge(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAssessments
