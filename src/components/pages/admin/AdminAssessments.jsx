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
  FiList,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import toast from '../../../utils/toast'
import LoadingSpinner from '../../common/LoadingSpinner'

const TABS = [
  { id: 'approvals', label: 'Approvals', icon: FiCheckCircle },
  { id: 'modules', label: 'Modules', icon: FiGrid },
  { id: 'knowledge', label: 'Knowledge Base', icon: FiBook },
  { id: 'reports', label: 'Test Reports', icon: FiFileText }
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

  // Modules tab: Departments → Modules → Tests
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [modules, setModules] = useState([])
  const [selectedModule, setSelectedModule] = useState(null)
  const [tests, setTests] = useState([])
  const [selectedTest, setSelectedTest] = useState(null)
  const [showAddDepartment, setShowAddDepartment] = useState(false)
  const [showAddModule, setShowAddModule] = useState(false)
  const [showAddTest, setShowAddTest] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newDepartmentDescription, setNewDepartmentDescription] = useState('')
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleDescription, setNewModuleDescription] = useState('')
  const [newTestName, setNewTestName] = useState('')
  const [newTestDescription, setNewTestDescription] = useState('')
  const [questions, setQuestions] = useState([])
  const [questionFile, setQuestionFile] = useState(null)
  const [testSettings, setTestSettings] = useState(defaultTestSettings)
  const [editingSettings, setEditingSettings] = useState(false)
  const [accordionSettingsOpen, setAccordionSettingsOpen] = useState(true)
  const [accordionQuestionsOpen, setAccordionQuestionsOpen] = useState(true)

  // Knowledge base tab state (request-based: user requests → admin approves & uploads)
  const [knowledgeRequests, setKnowledgeRequests] = useState([])
  const [knowledgeFilterStatus, setKnowledgeFilterStatus] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedRequestForUpload, setSelectedRequestForUpload] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadingRequest, setUploadingRequest] = useState(false)

  // Test reports tab state
  const [reportEmployees, setReportEmployees] = useState([])
  const [selectedReportEmployee, setSelectedReportEmployee] = useState(null)
  const [reportAttempts, setReportAttempts] = useState([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)
  const [reportModuleFilter, setReportModuleFilter] = useState('')
  const [reportTestFilter, setReportTestFilter] = useState('')
  const [reportFromDate, setReportFromDate] = useState('')
  const [reportToDate, setReportToDate] = useState('')
  const [selectedReportAttempt, setSelectedReportAttempt] = useState(null)

  useEffect(() => {
    if (activeTab === 'approvals') fetchApprovals()
    if (activeTab === 'modules') fetchDepartments()
    if (activeTab === 'knowledge') fetchKnowledgeRequests()
    if (activeTab === 'reports') fetchReportEmployees()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch on tab change
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'modules' && selectedDepartment) fetchModules()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDepartment])

  useEffect(() => {
    if (activeTab === 'modules' && selectedModule) fetchTests()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedModule])

  useEffect(() => {
    if (activeTab === 'modules' && selectedTest) {
      loadTestQuestions(selectedTest._id || selectedTest.id)
      loadTestSettings(selectedTest._id || selectedTest.id)
    } else if (activeTab === 'modules' && !selectedTest) {
      setQuestions([])
      setTestSettings(defaultTestSettings)
    }
  }, [activeTab, selectedTest])

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

  const fetchDepartments = async () => {
    try {
      const res = await axiosInstance.get('/api/assessments/departments').catch(() => ({ data: { departments: [] } }))
      setDepartments(res.data?.departments || [])
      if (!selectedDepartment && res.data?.departments?.length > 0) {
        setSelectedDepartment(res.data.departments[0])
      }
    } catch {
      setDepartments([])
    }
  }

  const fetchModules = async () => {
    try {
      setLoading(true)
      const url = selectedDepartment
        ? `/api/assessments/modules?departmentId=${selectedDepartment._id || selectedDepartment.id}`
        : '/api/assessments/modules'
      const res = await axiosInstance.get(url).catch(() => ({ data: { modules: [] } }))
      setModules(res.data?.modules || [])
      if (!selectedModule && res.data?.modules?.length > 0) {
        setSelectedModule(res.data.modules[0])
      } else if (selectedModule && !res.data?.modules?.some(m => (m._id || m.id) === (selectedModule._id || selectedModule.id))) {
        setSelectedModule(res.data.modules[0] || null)
      }
    } catch {
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTests = async () => {
    if (!selectedModule) {
      setTests([])
      setSelectedTest(null)
      return
    }
    try {
      const res = await axiosInstance.get(`/api/assessments/modules/${selectedModule._id || selectedModule.id}/tests`).catch(() => ({ data: { tests: [] } }))
      setTests(res.data?.tests || [])
      if (!selectedTest && res.data?.tests?.length > 0) {
        setSelectedTest(res.data.tests[0])
      } else if (selectedTest && !res.data?.tests?.some(t => (t._id || t.id) === (selectedTest._id || selectedTest.id))) {
        setSelectedTest(res.data.tests[0] || null)
      }
    } catch {
      setTests([])
      setSelectedTest(null)
    }
  }

  const loadTestQuestions = async (testId) => {
    try {
      const res = await axiosInstance.get(`/api/assessments/tests/${testId}/questions`).catch(() => ({ data: { questions: [] } }))
      setQuestions(res.data?.questions || [])
    } catch {
      setQuestions([])
    }
  }

  const loadTestSettings = async (testId) => {
    try {
      const res = await axiosInstance.get(`/api/assessments/tests/${testId}/settings`).catch(() => ({ data: { settings: defaultTestSettings } }))
      setTestSettings(res.data?.settings || defaultTestSettings)
    } catch {
      setTestSettings(defaultTestSettings)
    }
  }

  const fetchKnowledgeRequests = async (statusFilter) => {
    try {
      setLoading(true)
      const status = statusFilter !== undefined ? statusFilter : knowledgeFilterStatus
      const url = status
        ? `/api/assessments/knowledge-requests?status=${status}`
        : '/api/assessments/knowledge-requests'
      const res = await axiosInstance.get(url).catch(() => ({ data: { requests: [] } }))
      setKnowledgeRequests(res.data?.requests || [])
    } catch {
      setKnowledgeRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDepartment = (dept) => {
    setSelectedDepartment(dept)
    setSelectedModule(null)
    setSelectedTest(null)
  }

  const handleSelectModule = (mod) => {
    setSelectedModule(mod)
    setSelectedTest(null)
  }

  const handleSelectTest = (test) => {
    setSelectedTest(test)
  }

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast.error('Department name is required')
      return
    }
    try {
      const res = await axiosInstance.post('/api/assessments/departments', {
        name: newDepartmentName.trim(),
        description: newDepartmentDescription.trim()
      })
      const newDept = res.data?.department
      if (!newDept) throw new Error('Invalid response')
      setDepartments(prev => [...prev, newDept])
      setNewDepartmentName('')
      setNewDepartmentDescription('')
      setShowAddDepartment(false)
      toast.success('Department added successfully')
      setSelectedDepartment(newDept)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add department')
    }
  }

  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? All its modules and tests will be removed.`)) return
    try {
      await axiosInstance.delete(`/api/assessments/departments/${dept._id || dept.id}`)
      setDepartments(prev => prev.filter(d => (d._id || d.id) !== (dept._id || dept.id)))
      if (selectedDepartment && (selectedDepartment._id || selectedDepartment.id) === (dept._id || dept.id)) {
        setSelectedDepartment(departments.find(d => (d._id || d.id) !== (dept._id || dept.id)) || null)
        setModules([])
        setSelectedModule(null)
        setTests([])
        setSelectedTest(null)
      }
      toast.success('Department deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete department')
    }
  }

  const handleAddModule = async () => {
    if (!newModuleName.trim()) {
      toast.error('Module name is required')
      return
    }
    if (!selectedDepartment) {
      toast.error('Please select a department first')
      return
    }
    try {
      const res = await axiosInstance.post('/api/assessments/modules', {
        departmentId: selectedDepartment._id || selectedDepartment.id,
        name: newModuleName.trim(),
        description: newModuleDescription.trim()
      })
      const newMod = res.data?.module
      if (!newMod) throw new Error('Invalid response')
      setModules(prev => [...prev, newMod])
      setNewModuleName('')
      setNewModuleDescription('')
      setShowAddModule(false)
      toast.success('Module added successfully')
      setSelectedModule(newMod)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add module')
    }
  }

  const handleAddTest = async () => {
    if (!newTestName.trim()) {
      toast.error('Test name is required')
      return
    }
    if (!selectedModule) {
      toast.error('Please select a module first')
      return
    }
    try {
      const res = await axiosInstance.post(`/api/assessments/modules/${selectedModule._id || selectedModule.id}/tests`, {
        name: newTestName.trim(),
        description: newTestDescription.trim()
      })
      const newT = res.data?.test
      if (!newT) throw new Error('Invalid response')
      setTests(prev => [...prev, newT])
      setNewTestName('')
      setNewTestDescription('')
      setShowAddTest(false)
      toast.success('Test added successfully')
      setSelectedTest(newT)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add test')
    }
  }

  const handleDeleteTest = async (test) => {
    if (!window.confirm(`Delete test "${test.name}"? This cannot be undone.`)) return
    try {
      await axiosInstance.delete(`/api/assessments/tests/${test._id || test.id}`)
      setTests(prev => prev.filter(t => (t._id || t.id) !== (test._id || test.id)))
      if (selectedTest && (selectedTest._id || selectedTest.id) === (test._id || test.id)) {
        setSelectedTest(tests.find(t => (t._id || t.id) !== (test._id || test.id)) || null)
        setQuestions([])
        setTestSettings(defaultTestSettings)
      }
      toast.success('Test deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete test')
    }
  }

  const handleDeleteModule = async (mod) => {
    if (!window.confirm(`Delete module "${mod.name}"? All its tests will be removed.`)) return
    try {
      await axiosInstance.delete(`/api/assessments/modules/${mod._id || mod.id}`)
      setModules(prev => prev.filter(m => (m._id || m.id) !== (mod._id || mod.id)))
      if (selectedModule && (selectedModule._id || selectedModule.id) === (mod._id || mod.id)) {
        setSelectedModule(modules.find(m => (m._id || m.id) !== (mod._id || mod.id)) || null)
        setTests([])
        setSelectedTest(null)
        setQuestions([])
        setTestSettings(defaultTestSettings)
      }
      toast.success('Module deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete module')
    }
  }

  const handleUploadQuestions = async () => {
    if (!questionFile || !selectedTest) return
    if (!questionFile.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Please upload an Excel file (.xlsx)')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', questionFile)
      const res = await axiosInstance.post(`/api/assessments/tests/${selectedTest._id || selectedTest.id}/questions/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(res.data?.message || `Uploaded ${res.data?.count ?? 0} question(s)`)
      if (res.data?.errors?.length) {
        toast.error(`${res.data.errors.length} row(s) had errors. Check format.`)
      }
      setQuestionFile(null)
      setShowAddQuestion(false)
      loadTestQuestions(selectedTest._id || selectedTest.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    }
  }

  const handleSaveSettings = async () => {
    if (!selectedTest) return
    try {
      await axiosInstance.put(`/api/assessments/tests/${selectedTest._id || selectedTest.id}/settings`, testSettings)
      setEditingSettings(false)
      toast.success('Test settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    }
  }

  const openUploadModal = (req) => {
    setSelectedRequestForUpload(req)
    setUploadFile(null)
    setUploadTitle(req?.description?.slice(0, 80) || '')
    setShowUploadModal(true)
  }

  const handleApproveAndUpload = async () => {
    if (!selectedRequestForUpload || !uploadFile) {
      toast.error('Please select a file (PDF, DOC, DOCX, or TXT)')
      return
    }
    try {
      setUploadingRequest(true)
      const formData = new FormData()
      formData.append('title', uploadTitle.trim() || uploadFile.name)
      formData.append('file', uploadFile)
      await axiosInstance.put(
        `/api/assessments/knowledge-requests/${selectedRequestForUpload._id || selectedRequestForUpload.id}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      toast.success('Document uploaded. Requester can now view it (view-only).')
      setShowUploadModal(false)
      setSelectedRequestForUpload(null)
      setUploadFile(null)
      setUploadTitle('')
      fetchKnowledgeRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploadingRequest(false)
    }
  }

  const handleRejectKnowledgeRequest = async (req) => {
    if (!window.confirm('Reject this request? The user will see it as rejected.')) return
    try {
      await axiosInstance.put(`/api/assessments/knowledge-requests/${req._id || req.id}/reject`)
      toast.success('Request rejected')
      fetchKnowledgeRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject')
    }
  }

  // ---- Test Reports (admin) ----
  const fetchReportEmployees = async () => {
    try {
      setReportLoading(true)
      setReportError(null)
      const res = await axiosInstance.get('/api/assessments/reports/employees')
      setReportEmployees(res.data?.employees || [])
    } catch (err) {
      setReportEmployees([])
      setReportError(err.response?.data?.message || 'Failed to load test reports')
    } finally {
      setReportLoading(false)
    }
  }

  const fetchEmployeeAttempts = async (employeeId) => {
    try {
      setReportLoading(true)
      setReportError(null)
      const res = await axiosInstance.get(`/api/assessments/reports/employees/${encodeURIComponent(employeeId)}/attempts`)
      setReportAttempts(res.data?.attempts || [])
    } catch (err) {
      setReportAttempts([])
      setReportError(err.response?.data?.message || 'Failed to load attempts')
    } finally {
      setReportLoading(false)
    }
  }

  const handleDeleteKnowledgeRequest = async (req) => {
    if (!window.confirm('Delete this request and any uploaded document? This cannot be undone.')) return
    try {
      await axiosInstance.delete(`/api/assessments/knowledge-requests/${req._id || req.id}`)
      toast.success('Request deleted')
      setKnowledgeRequests(prev => prev.filter(r => (r._id || r.id) !== (req._id || req.id)))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
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
                          {req.departmentName ? (
                            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 font-medium">Department: {req.departmentName}</p>
                          ) : null}
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

            {/* Modules Tab: Department → Modules → Tests */}
            {activeTab === 'modules' && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Department | Module | Test lists */}
                <div className="lg:w-80 flex-shrink-0 space-y-4">
                  {/* Departments */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Departments</h3>
                      <button
                        onClick={() => setShowAddDepartment(true)}
                        className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                        title="Add department"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {departments.length === 0 ? (
                        <p className="p-4 text-gray-500 dark:text-gray-400 text-sm">No departments. Add one first.</p>
                      ) : (
                        departments.map(dept => (
                          <div
                            key={dept._id || dept.id}
                            onClick={() => handleSelectDepartment(dept)}
                            className={`flex items-center justify-between p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                              selectedDepartment && (selectedDepartment._id || selectedDepartment.id) === (dept._id || dept.id)
                                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{dept.name}</span>
                            <button onClick={e => { e.stopPropagation(); handleDeleteDepartment(dept) }} className="p-1 text-gray-400 hover:text-red-600">
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Modules (when department selected) */}
                  {selectedDepartment && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Modules</h3>
                        <button
                          onClick={() => setShowAddModule(true)}
                          className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                          title="Add module"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {modules.length === 0 ? (
                          <p className="p-4 text-gray-500 dark:text-gray-400 text-sm">No modules. Add one.</p>
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
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{mod.name}</span>
                              <button onClick={e => { e.stopPropagation(); handleDeleteModule(mod) }} className="p-1 text-gray-400 hover:text-red-600">
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tests (when module selected) */}
                  {selectedModule && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Tests</h3>
                        <button
                          onClick={() => setShowAddTest(true)}
                          className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                          title="Add test"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {tests.length === 0 ? (
                          <p className="p-4 text-gray-500 dark:text-gray-400 text-sm">No tests. Add one.</p>
                        ) : (
                          tests.map(t => (
                            <div
                              key={t._id || t.id}
                              onClick={() => handleSelectTest(t)}
                              className={`flex items-center justify-between p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                                selectedTest && (selectedTest._id || selectedTest.id) === (t._id || t.id)
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}
                            >
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{t.name}</span>
                              <button onClick={e => { e.stopPropagation(); handleDeleteTest(t) }} className="p-1 text-gray-400 hover:text-red-600">
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Test settings & questions (when test selected) */}
                <div className="flex-1 space-y-6">
                  {selectedTest ? (
                    <>
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setAccordionSettingsOpen(prev => !prev)}
                          className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <FiSettings className="w-4 h-4" />
                            Test Settings — {selectedTest.name}
                            <span className="text-gray-400 dark:text-gray-500 ml-1">
                              {accordionSettingsOpen ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                            </span>
                          </h3>
                          <div onClick={e => e.stopPropagation()} className="flex gap-2">
                            {editingSettings ? (
                              <>
                                <button onClick={handleSaveSettings} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm">
                                  <FiSave className="w-4 h-4" /> Save
                                </button>
                                <button onClick={() => setEditingSettings(false)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm">Cancel</button>
                              </>
                            ) : (
                              <button onClick={() => setEditingSettings(true)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm">
                                <FiEdit2 className="w-4 h-4" /> Edit
                              </button>
                            )}
                          </div>
                        </button>
                        {accordionSettingsOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        )}
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setAccordionQuestionsOpen(prev => !prev)}
                          className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <FiList className="w-4 h-4" />
                            Questions ({questions.length})
                            <span className="text-gray-400 dark:text-gray-500 ml-1">
                              {accordionQuestionsOpen ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                            </span>
                          </h3>
                          <span onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setShowAddQuestion(true)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm"
                            >
                              <FiUpload className="w-4 h-4" /> Upload Excel
                            </button>
                          </span>
                        </button>
                        {accordionQuestionsOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Upload an <strong>.xlsx</strong> file. Columns: <strong>SECTION</strong>, <strong>TYPE</strong> (mcq, yes_no, fill_blanks, short_answer, long_answer), <strong>QUESTION</strong>, <strong>OPTION_A</strong>–<strong>OPTION_D</strong>, <strong>CORRECT_ANSWER</strong>. First row = headers.
                          </p>
                          {questions.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No questions yet. Upload an Excel (.xlsx) file.</p>
                          ) : (
                            <ul className="space-y-3">
                              {questions.map((q, i) => (
                                <li key={q._id || q.id || i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <div className="flex flex-wrap gap-2 mb-1">
                                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{q.section || '—'}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{q.type || '—'}</span>
                                  </div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">{i + 1}. {q.text || q.question || 'Question'}</p>
                                  {q.options?.length > 0 && (
                                    <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {q.options.map((opt, j) => (
                                        <li key={j}>{opt.label || String.fromCharCode(65 + j)}) {opt.text || opt} {opt.label === (q.correctAnswer || '') || opt.text === q.correctAnswer ? '✓' : ''}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {q.type && ['fill_blanks', 'short_answer', 'long_answer'].includes(q.type) && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Answer: {q.correctAnswer}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
                      {!selectedDepartment
                        ? 'Select a department to manage modules.'
                        : !selectedModule
                          ? 'Select a module to manage tests.'
                          : 'Select a test or add a new one to configure settings and questions.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Knowledge Base Tab — Document requests from users; admin approves & uploads (view-only for requester) */}
            {activeTab === 'knowledge' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Knowledge Base — Document Requests</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 w-full sm:w-auto">Users request documents; you approve and upload. Only the requester can view (no download/copy).</p>
                  <select
                    value={knowledgeFilterStatus}
                    onChange={e => {
                      setKnowledgeFilterStatus(e.target.value)
                      fetchKnowledgeRequests(e.target.value)
                    }}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="p-4">
                  {knowledgeRequests.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-12">No document requests yet. Users submit requests from the Assessments portal Knowledge Base.</p>
                  ) : (
                    <div className="space-y-4">
                      {knowledgeRequests.map(req => (
                        <div
                          key={req._id || req.id}
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-medium text-gray-900 dark:text-gray-100">{req.requesterName || 'Unknown'}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">({req.employeeId})</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  req.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                  req.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              {req.title ? <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{req.title}</p> : null}
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{req.description}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                Requested: {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'N/A'}
                                {req.respondedAt ? ` · Responded: ${new Date(req.respondedAt).toLocaleString()}` : ''}
                              </p>
                              {req.status === 'approved' && req.documentTitle && (
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Document: {req.documentTitle}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {req.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => openUploadModal(req)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                                  >
                                    <FiUpload className="w-4 h-4" /> Approve & Upload
                                  </button>
                                  <button
                                    onClick={() => handleRejectKnowledgeRequest(req)}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteKnowledgeRequest(req)}
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Delete request"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Test Reports Tab */}
            {activeTab === 'reports' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-indigo-500" />
                  Test Reports
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  View analytics for completed assessments. Select an employee to see their test history with filters.
                </p>

                {reportError && (
                  <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-md px-3 py-2">
                    {reportError}
                  </div>
                )}

                {!selectedReportEmployee ? (
                  <>
                    {reportLoading ? (
                      <LoadingSpinner />
                    ) : reportEmployees.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No completed assessments found yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {reportEmployees.map(emp => (
                          <button
                            key={emp.employeeId}
                            type="button"
                            onClick={() => {
                              setSelectedReportEmployee(emp.employeeId)
                              setSelectedReportAttempt(null)
                              setReportModuleFilter('')
                              setReportTestFilter('')
                              setReportFromDate('')
                              setReportToDate('')
                              fetchEmployeeAttempts(emp.employeeId)
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.employeeId}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Attempts: {emp.attempts}{' '}
                                {emp.lastAttemptAt && `· Last: ${new Date(emp.lastAttemptAt).toLocaleString()}`}
                              </p>
                            </div>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">View reports →</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Employee: {selectedReportEmployee}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Filter and inspect this employee&apos;s test attempts.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReportEmployee(null)
                          setReportAttempts([])
                          setSelectedReportAttempt(null)
                        }}
                        className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      >
                        ← Back to employees
                      </button>
                    </div>

                    {reportLoading ? (
                      <LoadingSpinner />
                    ) : reportAttempts.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No attempts found for this employee.</p>
                    ) : (
                      <>
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 items-end mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Module</span>
                            <select
                              value={reportModuleFilter}
                              onChange={e => { setReportModuleFilter(e.target.value); setReportTestFilter('') }}
                              className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                            >
                              <option value="">All</option>
                              {Array.from(new Map(reportAttempts
                                .filter(a => a.moduleId)
                                .map(a => [String(a.moduleId), a.moduleName || 'Module'])).entries()).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Assessment</span>
                            <select
                              value={reportTestFilter}
                              onChange={e => setReportTestFilter(e.target.value)}
                              className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                            >
                              <option value="">All</option>
                              {Array.from(new Map(reportAttempts
                                .filter(a => (!reportModuleFilter || String(a.moduleId) === reportModuleFilter) && a.testId)
                                .map(a => [String(a.testId), a.testName || 'Assessment'])).entries()).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">From date</span>
                            <input
                              type="date"
                              value={reportFromDate}
                              onChange={e => setReportFromDate(e.target.value)}
                              className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">To date</span>
                            <input
                              type="date"
                              value={reportToDate}
                              onChange={e => setReportToDate(e.target.value)}
                              className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200"
                            />
                          </div>
                        </div>

                        {(() => {
                          const filtered = reportAttempts.filter(a => {
                            if (reportModuleFilter && String(a.moduleId) !== reportModuleFilter) return false
                            if (reportTestFilter && String(a.testId) !== reportTestFilter) return false
                            if (reportFromDate) {
                              const d = new Date(a.startedAt)
                              if (d < new Date(reportFromDate)) return false
                            }
                            if (reportToDate) {
                              const d = new Date(a.startedAt)
                              const end = new Date(reportToDate)
                              end.setHours(23, 59, 59, 999)
                              if (d > end) return false
                            }
                            return true
                          })

                          return (
                            <>
                              <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
                                  Attempts ({filtered.length})
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                  {filtered.map(a => (
                                    <button
                                      key={a._id || a.id}
                                      type="button"
                                      onClick={() => setSelectedReportAttempt(a)}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-3"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{a.testName}</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                          {[a.departmentName, a.moduleName].filter(Boolean).join(' · ')}
                                        </p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                          {a.startedAt && new Date(a.startedAt).toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                        <span className={`text-[11px] font-semibold ${a.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                          {a.scorePercent ?? 0}%
                                        </span>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                          {a.endReasonCode === 'user_submitted' ? 'Submitted' :
                                           a.endReasonCode === 'time_up' ? 'Time up' :
                                           a.endReasonCode === 'tab_switch' ? 'Tab switch' : 'Ended'}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {selectedReportAttempt && (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedReportAttempt.testName}</p>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        {[selectedReportAttempt.departmentName, selectedReportAttempt.moduleName].filter(Boolean).join(' · ')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                                    <div><span className="font-semibold">Started:</span> {selectedReportAttempt.startedAt && new Date(selectedReportAttempt.startedAt).toLocaleString()}</div>
                                    <div><span className="font-semibold">Ended:</span> {selectedReportAttempt.endedAt && new Date(selectedReportAttempt.endedAt).toLocaleString()}</div>
                                    <div><span className="font-semibold">Score:</span> {selectedReportAttempt.scorePercent}%</div>
                                    <div><span className="font-semibold">Result:</span> {selectedReportAttempt.passed ? 'Passed' : 'Not passed'}</div>
                                    <div><span className="font-semibold">End reason:</span> {selectedReportAttempt.endReasonText || selectedReportAttempt.endReasonCode}</div>
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Department Modal */}
      {showAddDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Department</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={e => setNewDepartmentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="e.g. Sales, Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  value={newDepartmentDescription}
                  onChange={e => setNewDepartmentDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleAddDepartment} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md font-medium">
                Add
              </button>
              <button onClick={() => { setShowAddDepartment(false); setNewDepartmentName(''); setNewDepartmentDescription('') }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {showAddModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Module</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Department: <strong>{selectedDepartment?.name || '—'}</strong></p>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
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

      {/* Add Test Modal */}
      {showAddTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Test</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Module: <strong>{selectedModule?.name || '—'}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newTestName}
                  onChange={e => setNewTestName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="e.g. Level 1 Assessment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  value={newTestDescription}
                  onChange={e => setNewTestDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleAddTest} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md font-medium">
                Add
              </button>
              <button onClick={() => { setShowAddTest(false); setNewTestName(''); setNewTestDescription('') }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question (Upload Excel) Modal */}
      {showAddQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Questions (Excel)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Upload <strong>.xlsx</strong> with columns: SECTION, TYPE, QUESTION, OPTION_A–D, CORRECT_ANSWER. Types: mcq, yes_no, fill_blanks, short_answer, long_answer.
            </p>
            <a
              href={`${axiosInstance.defaults.baseURL || ''}/api/assessments/questions-template`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
            >
              Download Excel template
            </a>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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

      {/* Approve & Upload document modal (Knowledge Base request) */}
      {showUploadModal && selectedRequestForUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Approve & Upload Document</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              For: <strong>{selectedRequestForUpload.requesterName}</strong> ({selectedRequestForUpload.employeeId})
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">Request: {selectedRequestForUpload.description}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document title (optional)</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Defaults to file name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File * (PDF, DOC, DOCX, TXT)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleApproveAndUpload}
                disabled={uploadingRequest || !uploadFile}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md font-medium disabled:opacity-50"
              >
                {uploadingRequest ? 'Uploading…' : 'Approve & Upload'}
              </button>
              <button
                onClick={() => { setShowUploadModal(false); setSelectedRequestForUpload(null); setUploadFile(null); setUploadTitle('') }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              >
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
