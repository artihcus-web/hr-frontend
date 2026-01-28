import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FiEdit2, FiTrash2, FiUpload, FiX, FiSearch, FiFilter, FiDownload, FiChevronDown, FiChevronUp, FiSave, FiPlus, FiMoreVertical } from 'react-icons/fi'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import axiosInstance from '../../../utils/axiosInstance'
import LoadingSpinner from '../../common/LoadingSpinner'

const roles = ['admin', 'c-suite', 'hr', 'manager', 'supermanager', 'tl', 'employee', 'client']
const genders = ['Male', 'Female', 'Other']
const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed']
const accountTypes = ['Savings', 'Current', 'Salary']
const paymentModes = ['Bank Transfer', 'Cheque', 'Cash']
const verificationStatuses = ['Pending', 'In Progress', 'Completed', 'Failed']

// const sections = [ // Removed unused
//   { id: 1, title: 'Basic Information', slug: 'basic' },
//   { id: 2, title: 'Employment', slug: 'employment' },
//   { id: 3, title: 'Professional', slug: 'professional' },
//   { id: 4, title: 'Bank Details', slug: 'bank' },
//   { id: 5, title: 'Documents', slug: 'documents' },
//   { id: 6, title: 'Verification', slug: 'verification' },
//   { id: 7, title: 'PF Details', slug: 'pf' },
//   { id: 8, title: 'ESI Details', slug: 'esi' },
//   { id: 9, title: 'Account Setup', slug: 'account' }
// ]

// FormField component - moved outside to prevent re-creation on every render
const FormField = ({ label, name, type = 'text', required = false, placeholder = '', options = null, formData, handleChange, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {type === 'select' ? (
      <select
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        required={required}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        {...props}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options?.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    ) : type === 'checkbox' ? (
      <div className="flex items-center">
        <input
          type="checkbox"
          name={name}
          checked={formData[name] || false}
          onChange={handleChange}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded transition-colors"
        />
        <label className="ml-2 text-xs text-gray-700 dark:text-gray-300">{label}</label>
      </div>
    ) : type === 'textarea' ? (
      <textarea
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        rows={2}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        {...props}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        {...props}
      />
    )}
  </div>
)

// FormSection component - refactored for Accordion mode
const FormSection = ({ title, children, isOpen, onToggle, onSave, isSubmitting, sectionId }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-2 overflow-hidden shadow-sm transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus:outline-none"
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {isOpen ? <FiChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : <FiChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {children}
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={(e) => onSave(e, sectionId)}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
            >

              {isSubmitting ? 'Saving...' : 'SAVE'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserManagement() {
  const navigate = useNavigate()
  const { user, token, loading } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [availableProjects, setAvailableProjects] = useState([])
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ total: 0, success: 0, failed: 0, errors: [] })
  const fileInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  // const [showFilters, setShowFilters] = useState(false) // Removed unused

  // Action Menu State
  const [openActionMenuId, setOpenActionMenuId] = useState(null)

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null)
    if (openActionMenuId) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openActionMenuId])

  const toggleActionMenu = (id, e) => {
    e.stopPropagation()
    setOpenActionMenuId(prev => (prev === id ? null : id))
  }

  const [formData, setFormData] = useState({
    // Basic Information
    firstName: '',
    middleName: '',
    lastName: '',
    employeeName: '', // Auto-generated
    email: '',
    phone: '',
    employeeId: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    bloodGroup: '',
    emergencyContact: '',
    presentAddress: '',
    nickName: '',
    employeeRefNumber: '',
    birthdayDate: '',
    marriageDate: '',
    secondaryContact: '',
    officeEmail: '',
    fathersName: '',
    spouseName: '',
    spouseDob: '',
    loginUsername: '',
    ipAddress: '',
    permanentAddress: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    isPhysicallyChallenged: false,
    isInternationalEmployee: false,
    countryOfOrigin: '',
    cityLocation: '',
    mobileNumber: '',
    numberOfChildren: 0,
    childrenDobs: [],

    // Employment Information
    department: '',
    designation: '',
    role: 'employee',
    employeeStatus: 'Active',
    joiningDate: '',
    exitDate: '',
    cid: '',
    managerId: '',
    superManagerId: '',
    confirmDate: '',
    probationPeriod: '',
    noticePeriod: '',
    division: '',
    costCenter: '',
    grade: '',
    location: '',
    employeeNumberSeries: '',
    assignedProjects: [],

    // Professional Information
    education: '',
    experience: '',
    skills: '',
    salary: '',

    // Bank Details
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    accountType: '',
    branchName: '',
    bankBranch: '',
    salaryPaymentMode: '',
    ddPayableAt: '',
    nameAsPerBankRecords: '',
    iban: '',

    // Documents
    aadharNumber: '',
    panNumber: '',
    passportNumber: '',
    drivingLicense: '',
    aadhaarCardEnrolmentNo: '',
    nameAsOnAadhaarCard: '',
    universalAccountNumber: '',

    // Background Verification
    verificationStatus: '',
    verificationIndication: '',
    completedOn: '',
    agencyName: '',
    remarks: '',

    // PF Details
    isEligibleForPF: false,
    pfNumber: '',
    pfScheme: '',
    pfJoiningDate: '',
    eligibleForExcessEPFContribution: false,
    isEligibleForExcessEPSContribution: false,
    isExistingMemberOfPF: false,

    // ESI Details
    isEligibleForESI: false,
    esiNumber: '',
    isCoveredUnderLWF: false,

    // Account Setup
    password: ''
  })
  const [submittingSection, setSubmittingSection] = useState(null)


  // Accordion State
  const [expandedSections, setExpandedSections] = useState([1]) // First section open by default

  const toggleSection = (id) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
      return
    }
    if (user && user.role !== 'admin') {
      navigate('/')
    }
  }, [navigate, user, loading])

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    if (!token) return

    try {
      setLoadingEmployees(true)
      const res = await axiosInstance.get('/api/auth/users')
      const data = res.data

      const nonAdminUsers = (data.users || []).filter(u => u.role !== 'admin')
      setEmployees(nonAdminUsers)
    } catch (error) {
      console.error('Error fetching employees:', error)
      // Global toast handles 5xx/network. 
      // We can toast for other errors if needed, or rely on global.
    } finally {
      setLoadingEmployees(false)
    }
  }, [token])

  // Fetch available projects
  const fetchProjects = useCallback(async () => {
    if (!token) return

    try {
      // Endpoint is /api/projects
      const res = await axiosInstance.get('/api/projects')
      const data = res.data
      setAvailableProjects(data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }, [token])

  useEffect(() => {
    if (user && user.role === 'admin' && token && !showForm) {
      fetchEmployees()
      fetchProjects()
    }
  }, [user, token, showForm, fetchEmployees, fetchProjects])

  // Whenever the multi-step form is opened (Add/Edit), reset progress
  // and scroll the main content container to the top.
  useEffect(() => {
    if (!showForm) return

    setExpandedSections([1])
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [showForm])



  // Auto-generate Employee Name
  useEffect(() => {
    const { firstName, middleName, lastName } = formData
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ')
    if (formData.employeeName !== fullName) {
      setFormData(prev => ({ ...prev, employeeName: fullName }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.firstName, formData.middleName, formData.lastName, formData.employeeName])

  const handleChildCountChange = (e) => {
    const count = parseInt(e.target.value) || 0
    setFormData(prev => {
      const currentDobs = prev.childrenDobs || []
      let newDobs = [...currentDobs]
      if (count > newDobs.length) {
        for (let i = newDobs.length; i < count; i++) newDobs.push('')
      } else {
        newDobs = newDobs.slice(0, count)
      }
      return { ...prev, numberOfChildren: count, childrenDobs: newDobs }
    })
  }

  const handleChildDobChange = (index, value) => {
    setFormData(prev => {
      const newDobs = [...(prev.childrenDobs || [])]
      newDobs[index] = value
      return { ...prev, childrenDobs: newDobs }
    })
  }

  // const validateSection = (sectionId, data) => { // Removed unused
  //   // Helper to check if value exists
  //   const hasValue = (val) => val !== undefined && val !== null && String(val).trim() !== ''
  //
  //   switch (sectionId) {
  //     case 1: // Basic Information
  //       return (
  //         hasValue(data.firstName) &&
  //         hasValue(data.lastName) &&
  //         hasValue(data.gender) &&
  //         hasValue(data.email) &&
  //         hasValue(data.phone) &&
  //         hasValue(data.presentAddress) &&
  //         hasValue(data.emergencyContact) &&
  //         hasValue(data.employeeId)
  //       )
  //     case 2: // Employment Information
  //       // Role and Status typically have defaults, but good to check if they are "select" fields
  //       return hasValue(data.role) && hasValue(data.employeeStatus)
  //     case 9: // Account Setup
  //       // Password required only for new employees
  //       if (!editingEmployee) {
  //         return hasValue(data.password)
  //       }
  //       return true
  //     default:
  //       // Other sections have no strict mandatory fields in the current requirement
  //       return true
  //   }
  // }


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Load employee data into form for editing
  const handleEdit = async (employeeId) => {
    try {
      const res = await axiosInstance.get(`/api/auth/users/${employeeId}`)
      const data = res.data

      const emp = data.user
      // Format dates for input fields (YYYY-MM-DD)
      const formatDate = (date) => {
        if (!date) return ''
        const d = new Date(date)
        if (isNaN(d.getTime())) return ''
        return d.toISOString().split('T')[0]
      }

      // Populate form with employee data
      setFormData({
        firstName: emp.firstName || '',
        middleName: emp.middleName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        phone: emp.phone || '',
        employeeId: emp.employeeId || '',
        dateOfBirth: formatDate(emp.dateOfBirth),
        gender: emp.gender || '',
        maritalStatus: emp.maritalStatus || '',
        bloodGroup: emp.bloodGroup || '',
        emergencyContact: emp.emergencyContact || '',
        presentAddress: emp.presentAddress || '',
        nickName: emp.nickName || '',
        employeeRefNumber: emp.employeeRefNumber || '',
        birthdayDate: formatDate(emp.birthdayDate),
        marriageDate: formatDate(emp.marriageDate),
        fathersName: emp.fathersName || '',
        secondaryContact: emp.secondaryContact || '',
        officeEmail: emp.officeEmail || '',
        spouseName: emp.spouseName || '',
        loginUsername: emp.loginUsername || emp.username || '',
        ipAddress: emp.ipAddress || '',
        permanentAddress: emp.permanentAddress || '',
        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactNumber: emp.emergencyContactNumber || '',
        isPhysicallyChallenged: emp.isPhysicallyChallenged || false,
        isInternationalEmployee: emp.isInternationalEmployee || false,
        countryOfOrigin: emp.countryOfOrigin || '',
        cityLocation: emp.cityLocation || '',
        mobileNumber: emp.mobileNumber || '',
        numberOfChildren: emp.numberOfChildren || 0,
        childrenDobs: Array.isArray(emp.childrenDobs) ? emp.childrenDobs.map(formatDate) : [],
        department: emp.department || '',
        designation: emp.designation || '',
        role: emp.role || 'employee',
        employeeStatus: emp.employeeStatus || 'Active',
        joiningDate: formatDate(emp.joiningDate),
        exitDate: formatDate(emp.exitDate),
        cid: emp.cid || '',
        managerId: emp.managerId || '',
        superManagerId: emp.superManagerId || '',
        confirmDate: formatDate(emp.confirmDate),
        probationPeriod: emp.probationPeriod || '',
        noticePeriod: emp.noticePeriod || '',
        division: emp.division || '',
        costCenter: emp.costCenter || '',
        grade: emp.grade || '',
        location: emp.location || '',
        employeeNumberSeries: emp.employeeNumberSeries || '',
        assignedProjects: emp.assignedProjects || [],
        education: emp.education || '',
        experience: emp.experience || '',
        skills: emp.skills || '',
        salary: emp.salary || '',
        accountNumber: emp.accountNumber || '',
        bankName: emp.bankName || '',
        ifscCode: emp.ifscCode || '',
        accountType: emp.accountType || '',
        branchName: emp.branchName || '',
        bankBranch: emp.bankBranch || '',
        salaryPaymentMode: emp.salaryPaymentMode || '',
        ddPayableAt: emp.ddPayableAt || '',
        nameAsPerBankRecords: emp.nameAsPerBankRecords || '',
        iban: emp.iban || '',
        aadharNumber: emp.aadharNumber || '',
        panNumber: emp.panNumber || '',
        passportNumber: emp.passportNumber || '',
        drivingLicense: emp.drivingLicense || '',
        aadhaarCardEnrolmentNo: emp.aadhaarCardEnrolmentNo || '',
        nameAsOnAadhaarCard: emp.nameAsOnAadhaarCard || '',
        universalAccountNumber: emp.universalAccountNumber || '',
        verificationStatus: emp.verificationStatus || '',
        verificationIndication: emp.verificationIndication || '',
        completedOn: formatDate(emp.completedOn),
        agencyName: emp.agencyName || '',
        remarks: emp.remarks || '',
        isEligibleForPF: emp.isEligibleForPF || false,
        pfNumber: emp.pfNumber || '',
        pfScheme: emp.pfScheme || '',
        pfJoiningDate: formatDate(emp.pfJoiningDate),
        eligibleForExcessEPFContribution: emp.eligibleForExcessEPFContribution || false,
        isEligibleForExcessEPSContribution: emp.isEligibleForExcessEPSContribution || false,
        isExistingMemberOfPF: emp.isExistingMemberOfPF || false,
        isEligibleForESI: emp.isEligibleForESI || false,
        esiNumber: emp.esiNumber || '',
        isCoveredUnderLWF: emp.isCoveredUnderLWF || false,
        password: '' // Don't pre-fill password
      })
      setEditingEmployee(employeeId)
      setShowForm(true)
    } catch (error) {
      console.error('Error loading employee:', error)
      toast.error('Failed to load employee data')
    }
  }

  // Handle delete with confirmation
  const handleDeleteClick = (employee) => {
    setDeleteConfirmation(employee)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation || !token) return

    setDeleting(true)
    try {
      await axiosInstance.delete(`/api/auth/users/${deleteConfirmation._id || deleteConfirmation.id}`)

      toast.success('Employee deleted successfully')
      setDeleteConfirmation(null)
      await fetchEmployees()
    } catch (error) {
      console.error('Delete error:', error)
      // Let global toast handle 5xx. For manual error handling:
      if (error.response && error.response.status < 500) {
        toast.error(error.response.data.message || 'Failed to delete employee')
      }
      setDeleteConfirmation(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null)
  }

  // Handle Excel file import
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload a valid Excel file (.xlsx, .xls) or CSV file')
      return
    }

    setImporting(true)
    setImportProgress({ total: 0, success: 0, failed: 0, errors: [] })

    try {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet)

          if (jsonData.length === 0) {
            toast.error('Excel file is empty')
            setImporting(false)
            return
          }

          // Map Excel columns to form fields
          const mapExcelRowToEmployee = (row) => {
            // Common column name mappings
            const mapping = {
              'First Name': 'firstName',
              'First Name *': 'firstName', // Handle asterisk
              'FirstName': 'firstName',
              'first_name': 'firstName',
              'Middle Name': 'middleName',
              'MiddleName': 'middleName',
              'middle_name': 'middleName',
              'Last Name': 'lastName',
              'Last Name *': 'lastName', // Handle asterisk
              'LastName': 'lastName',
              'last_name': 'lastName',
              'Email': 'email',
              'Email *': 'email', // Handle asterisk
              'email': 'email',
              'Phone': 'phone',
              'Phone *': 'phone',
              'phone': 'phone',
              'Phone Number': 'phone',
              'PhoneNumber': 'phone',
              'phone_number': 'phone',
              'Employee ID': 'employeeId',
              'Employee ID *': 'employeeId', // Handle asterisk
              'EmployeeID': 'employeeId',
              'Employee Id': 'employeeId',
              'employee_id': 'employeeId',
              'Emp ID': 'employeeId',
              'Role': 'role',
              'role': 'role',
              'Department': 'department',
              'department': 'department',
              'Designation': 'designation',
              'designation': 'designation',
              'Password': 'password',
              'password': 'password',
              'Location': 'location',
              'location': 'location',
              'Location (City)': 'cityLocation',
              'Location (City) .': 'cityLocation', // Handle trailing space dot
              'Location (City).': 'cityLocation', // Handle immediate dot
              'City': 'cityLocation',
              'Spouse DOB': 'spouseDob',
              'Number of Children': 'numberOfChildren',
              'Number of Children *': 'numberOfChildren',
              'Children DOBs': 'childrenDobs',
              'DOB as per Aadhaar': 'birthdayDate',
              'Exit Date': 'exitDate',
              'Employee Status': 'employeeStatus',
              'Nick Name': 'nickName',
              'Office Mail ID': 'officeEmail',
              'Office Mail ID *': 'officeEmail',
              'Secondary Contact': 'secondaryContact',
              'Secondary Contact *': 'secondaryContact',
              'Employee Ref Number': 'employeeRefNumber',
              'Date of Birth': 'dateOfBirth',
              'Gender': 'gender',
              'Gender *': 'gender',
              'Marital Status': 'maritalStatus',
              'Marital Status *': 'maritalStatus',
              'Marriage Date': 'marriageDate',
              'Blood Group': 'bloodGroup',
              'Is Physically Challenged': 'isPhysicallyChallenged',
              'Is International Employee': 'isInternationalEmployee',
              'Is International Employee *': 'isInternationalEmployee', // Handle asterisk
              'Country of Origin': 'countryOfOrigin',
              'Emergency Contact': 'emergencyContact',
              'Emergency Contact Name': 'emergencyContactName',
              'Present Address': 'presentAddress',
              'Permanent Address': 'permanentAddress',
              'Father\'s Name': 'fathersName',
              'Spouse Name': 'spouseName',
              'IP Address': 'ipAddress',
              'Joining Date': 'joiningDate',
              'CID': 'cid',
              'Manager ID': 'managerId',
              'Super Manager ID': 'superManagerId',
              'Super Manager ID *': 'superManagerId', // Handle asterisk
              'Confirm Date': 'confirmDate',
              'Probation Period': 'probationPeriod',
              'Notice Period': 'noticePeriod',
              'Division': 'division',
              'Cost Center': 'costCenter',
              'Grade': 'grade',

              // Professional
              'Education': 'education',
              'Experience': 'experience',
              'Skills': 'skills',
              'Salary': 'salary',

              // Bank Details
              'Account Number': 'accountNumber',
              'Bank Name': 'bankName',
              'IFSC Code': 'ifscCode',
              'Account Type': 'accountType',
              'Branch Name': 'branchName',
              'Bank Branch': 'bankBranch',
              'Salary Payment Mode': 'salaryPaymentMode',
              'DD Payable At': 'ddPayableAt',
              'Name as per Bank Records': 'nameAsPerBankRecords',
              'IBAN': 'iban',

              // Documents
              'Aadhar Number': 'aadharNumber',
              'PAN Number': 'panNumber',
              'Passport Number': 'passportNumber',
              'Driving License': 'drivingLicense',
              'Aadhaar Card Enrolment No': 'aadhaarCardEnrolmentNo',
              'Name (As on Aadhaar Card)': 'nameAsOnAadhaarCard',
              'Name as on Aadhaar Card': 'nameAsOnAadhaarCard',
              'Universal Account Number': 'universalAccountNumber',

              // Background Verification
              'Background Verification Status': 'verificationStatus',
              'Verification Status': 'verificationStatus',
              'Verification Indication': 'verificationIndication',
              'Completed On': 'completedOn',
              'Agency Name': 'agencyName',
              'Remarks': 'remarks',

              // PF Details
              'Is Employee Eligible for PF': 'isEligibleForPF',
              'PF Number': 'pfNumber',
              'PF Scheme': 'pfScheme',
              'PF Joining Date': 'pfJoiningDate',
              'Eligible for Excess EPF Contribution': 'eligibleForExcessEPFContribution',
              'Is Employee Eligible for Excess EPS Contribution': 'isEligibleForExcessEPSContribution',
              'Is Existing Member of PF': 'isExistingMemberOfPF',

              // ESI Details
              'Is Employee Eligible for ESI': 'isEligibleForESI',
              'ESI Number': 'esiNumber',
              'Is Covered Under LWF': 'isCoveredUnderLWF'
            }

            const employee = {}

            // Map each column
            Object.keys(row).forEach(key => {
              const normalizedKey = key.trim()
              const fieldName = mapping[normalizedKey] || normalizedKey.toLowerCase().replace(/\s+/g, '')

              // Only include if it's a valid field
              if (fieldName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
                employee[fieldName] = row[key]
              }
            })

            // Handle special fields
            if (employee.childrenDobs && typeof employee.childrenDobs === 'string') {
              // Split by comma and trim
              employee.childrenDobs = employee.childrenDobs.split(',').map(d => d.trim())
            }

            // Convert Boolean fields (Yes/No or true/false)
            const booleanFields = [
              'isPhysicallyChallenged', 'isInternationalEmployee',
              'isEligibleForPF', 'eligibleForExcessEPFContribution',
              'isEligibleForExcessEPSContribution', 'isExistingMemberOfPF',
              'isEligibleForESI', 'isCoveredUnderLWF'
            ]

            booleanFields.forEach(field => {
              if (employee[field]) {
                const val = String(employee[field]).toLowerCase().trim()
                employee[field] = (val === 'yes' || val === 'true')
              }
            })

            // Convert Number fields
            const numberFields = ['numberOfChildren', 'salary', 'probationPeriod', 'noticePeriod']
            numberFields.forEach(field => {
              if (employee[field] !== undefined && employee[field] !== null && employee[field] !== '') {
                const num = Number(employee[field])
                if (!isNaN(num)) {
                  employee[field] = num
                }
              }
            })

            // Ensure required fields
            if (!employee.firstName) employee.firstName = ''
            if (!employee.email) employee.email = ''
            if (!employee.phone) employee.phone = ''
            if (!employee.employeeId) employee.employeeId = ''
            if (!employee.role) employee.role = 'employee'
            if (!employee.password) {
              // Generate default password if not provided
              employee.password = `Temp${employee.employeeId || 'Pass'}123!`
            }

            return employee
          }

          // Process all rows
          const employees = jsonData.map(mapExcelRowToEmployee)

          setImportProgress(prev => ({ ...prev, total: employees.length }))

          // Import employees one by one
          let successCount = 0
          let failedCount = 0
          const errors = []

          for (let i = 0; i < employees.length; i++) {
            const emp = employees[i]

            // Validate required fields
            if (!emp.firstName || !emp.email || !emp.phone || !emp.employeeId) {
              failedCount++
              errors.push(`Row ${i + 2}: Missing required fields (FirstName, Email, Phone, EmployeeID)`)
              continue
            }

            try {
              const apiData = {
                username: emp.loginUsername || emp.employeeId,
                email: emp.email,
                password: emp.password,
                fullName: `${emp.firstName} ${emp.lastName || ''}`.trim(),
                role: emp.role || 'employee',
                ...emp
              }

              // Use axiosInstance.post - it throws on error
              await axiosInstance.post('/api/auth/users', apiData)
              successCount++

            } catch (error) {
              failedCount++
              const msg = error.response?.data?.message || 'Failed to create'
              errors.push(`Row ${i + 2}: ${msg}`)
            }

            // Update progress
            setImportProgress({
              total: employees.length,
              success: successCount,
              failed: failedCount,
              errors: [...errors]
            })
          }

          // Show results
          if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} employee(s)`)
            await fetchEmployees()
          }

          if (failedCount > 0) {
            toast.error(`Failed to import ${failedCount} employee(s). ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}`)
          }

          // Close modal after a delay if all successful
          if (failedCount === 0) {
            setTimeout(() => {
              setShowImportModal(false)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }, 2000)
          }
        } catch (err) {
          toast.error('Error parsing Excel file: ' + err.message)
        } finally {
          setImporting(false)
        }
      }

      reader.onerror = () => {
        toast.error('Error reading file')
        setImporting(false)
      }

      reader.readAsArrayBuffer(file)
    } catch (err) {
      toast.error('Error processing file: ' + err.message)
      setImporting(false)
    }
  }

  // Helper to format employee for export
  const formatEmployeeForExport = (emp) => {
    // Clone and remove sensitive/internal fields
    const { _id, id: _unusedId, __v, password: _unusedPassword, profileImage: _unusedProfileImage, ...rest } = emp

    // Flatten or format specific fields if needed
    return {
      ...rest,
      dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : '',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '',
    }
  }

  const handleExportAll = () => {
    if (employees.length === 0) {
      toast.error('No employees to export')
      return
    }

    try {
      const dataToExport = employees.map(formatEmployeeForExport)
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Employees")
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `All_Employees_${dateStr}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Export successful')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export data')
    }
  }

  const handleExportSingle = (emp) => {
    try {
      const dataToExport = [formatEmployeeForExport(emp)]
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Employee Details")
      const name = (emp.firstName || 'Employee').replace(/[^a-z0-9]/gi, '_')
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `Employee_${name}_${dateStr}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Export successful')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export data')
    }
  }

  // Generate profile avatar with initials
  const getInitials = (emp) => {
    const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || 'U'
    const parts = name.split(' ').filter(p => p)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Generate avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      employeeId: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      bloodGroup: '',
      emergencyContact: '',
      presentAddress: '',
      nickName: '',
      employeeRefNumber: '',
      birthdayDate: '',
      marriageDate: '',
      fathersName: '',
      spouseName: '',
      spouseDob: '',
      loginUsername: '',
      ipAddress: '',
      permanentAddress: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      isPhysicallyChallenged: false,
      isInternationalEmployee: false,
      countryOfOrigin: '',
      cityLocation: '',
      mobileNumber: '',
      numberOfChildren: 0,
      childrenDobs: [],
      department: '',
      designation: '',
      role: 'employee',
      employeeStatus: 'Active',
      joiningDate: '',
      exitDate: '',
      cid: '',
      managerId: '',
      superManagerId: '',
      confirmDate: '',
      probationPeriod: '',
      noticePeriod: '',
      division: '',
      costCenter: '',
      grade: '',
      location: '',
      employeeNumberSeries: '',
      education: '',
      experience: '',
      skills: '',
      salary: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      accountType: '',
      branchName: '',
      bankBranch: '',
      salaryPaymentMode: '',
      ddPayableAt: '',
      nameAsPerBankRecords: '',
      iban: '',
      aadharNumber: '',
      panNumber: '',
      passportNumber: '',
      drivingLicense: '',
      aadhaarCardEnrolmentNo: '',
      nameAsOnAadhaarCard: '',
      universalAccountNumber: '',
      verificationStatus: '',
      verificationIndication: '',
      completedOn: '',
      agencyName: '',
      remarks: '',
      isEligibleForPF: false,
      pfNumber: '',
      pfScheme: '',
      pfJoiningDate: '',
      eligibleForExcessEPFContribution: false,
      isEligibleForExcessEPSContribution: false,
      isExistingMemberOfPF: false,
      isEligibleForESI: false,
      esiNumber: '',
      isCoveredUnderLWF: false,
      password: ''
    })
    setEditingEmployee(null)
  }

  const handleSubmit = async (e, sectionId = null) => {
    if (e) e.preventDefault()
    if (!token) {
      toast.error('Not authenticated')
      return
    }

    // Validate required fields for initial creation
    if (!editingEmployee) {
      const missingFields = []
      if (!formData.firstName) missingFields.push('First Name')
      if (!formData.email) missingFields.push('Email')
      if (!formData.phone) missingFields.push('Phone')
      if (!formData.employeeId) missingFields.push('Employee ID')

      if (missingFields.length > 0) {
        toast.error(`Initial creation requires: ${missingFields.join(', ')}`)
        return
      }
    } else {
      // For updates, at least ensure ID and Email aren't wiped accidentally (though they are usually disabled/pre-filled)
      if (!formData.employeeId || !formData.email) {
        toast.error('Employee ID and Email are required')
        return
      }
    }

    setSubmittingSection(sectionId)

    try {
      // Prepare data for API (map to backend expected format)
      const apiData = {
        username: formData.loginUsername || formData.employeeId,
        email: formData.email,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        role: formData.role,
        // Include all other fields
        ...formData
      }

      // Only include password if provided (for new employees or password change)
      if (formData.password) {
        apiData.password = formData.password
      }

      if (editingEmployee) {
        await axiosInstance.put(`/api/auth/users/${editingEmployee}`, apiData)
        toast.success('Employee updated successfully')
      } else {
        const res = await axiosInstance.post('/api/auth/users', apiData)
        const newEmployee = res.data.user
        setEditingEmployee(newEmployee._id || newEmployee.id)
        toast.success('Employee created successfully. You can now continue with other sections.')
      }

      // Refresh employees list but KEEP form open for incremental saving
      await fetchEmployees()

    } catch (error) {
      console.error('Submit error:', error)
      if (error.response && error.response.status < 500) {
        toast.error(error.response.data.message || `Failed to ${editingEmployee ? 'update' : 'create'} employee`)
      }
      // 5xx handled globally
    } finally {
      setSubmittingSection(null)
    }
  }


  // Filter employees based on search and filters
  const filteredEmployees = employees.filter(emp => {
    const fullName = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
    const matchesSearch = !searchQuery ||
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone || '').includes(searchQuery)

    const matchesRole = filterRole === 'all' || emp.role === filterRole
    const matchesDepartment = filterDepartment === 'all' || (emp.department || '').toLowerCase() === filterDepartment.toLowerCase()
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && emp.isActive !== false) ||
      (filterStatus === 'inactive' && emp.isActive === false)

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus
  })

  // Get unique departments and roles for filters
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort()
  const uniqueRoles = [...new Set(employees.map(emp => emp.role).filter(Boolean))].sort()

  // Calculate total for display
  const totalEmployees = employees.length

  // Employee List View
  if (!showForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Redesigned Header Section */}
          <div className="mb-8 space-y-6">
            {/* Title & Top Actions Row */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Employee Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage employee accounts, roles, and access permissions.
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    Total: {totalEmployees}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-800 transition-all shadow-sm"
                >
                  <FiUpload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>

                <button
                  onClick={() => handleExportAll()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-800 transition-all shadow-sm"
                >
                  <FiDownload className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all active:scale-95"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>Add Employee</span>
                </button>
              </div>
            </div>

            {/* Unified Toolbar: Search & Filters */}
            <div className="bg-white dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3 transition-colors">
              {/* Search Field */}
              <div className="relative w-full lg:max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-0 sm:text-sm"
                />
              </div>

              {/* Divider (Desktop) */}
              <div className="hidden lg:block w-px h-8 bg-gray-200 dark:bg-gray-800 mx-2"></div>

              {/* Filters Row */}
              <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
                {/* Role Filter */}
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full sm:w-40 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  ))}
                </select>

                {/* Department Filter */}
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full sm:w-32 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Clear Filters (Conditional) */}
                {(filterRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterRole('all')
                      setFilterDepartment('all')
                      setFilterStatus('all')
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Clear All Filters"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Employees Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors">
            {loadingEmployees ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner className="h-10 w-10 text-indigo-500" />
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-4">No employees found.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add First Employee
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
                    <tr>

                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 transition-colors">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-600 font-medium text-lg mb-2">No employees found</p>
                            <p className="text-gray-500 text-sm">
                              {searchQuery || filterRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Get started by adding your first employee'}
                            </p>
                            {(!searchQuery && filterRole === 'all' && filterDepartment === 'all' && filterStatus === 'all') && (
                              <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Add First Employee
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : filteredEmployees.map((emp) => {
                      const fullName = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
                      const initials = getInitials(emp)
                      const avatarColor = getAvatarColor(fullName)

                      return (
                        <tr
                          key={emp._id || emp.id}
                          className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors duration-150"
                        >
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                              {emp.employeeId || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              {/* Profile Avatar */}
                              {emp.profileImage ? (
                                <img
                                  src={emp.profileImage}
                                  alt={fullName}
                                  className="w-10 h-10 rounded-full object-cover shadow-md border border-gray-200"
                                />
                              ) : (
                                <div className={`${avatarColor} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0`}>
                                  {initials}
                                </div>
                              )}
                              {/* Name and Email */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {fullName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {emp.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-400">
                              {emp.phone || 'N/A'}
                            </div>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full shadow-sm ${emp.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' :
                              emp.role === 'manager' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                                emp.role === 'hr' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' :
                                  emp.role === 'c-suite' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                              }`}>
                              {emp.role || 'employee'}
                            </span>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${emp.isActive !== false
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                              {emp.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-center relative">
                              <button
                                onClick={(e) => toggleActionMenu(emp._id || emp.id, e)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors focus:outline-none"
                              >
                                <FiMoreVertical className="w-5 h-5" />
                              </button>

                              {openActionMenuId === (emp._id || emp.id) && (
                                <div className="absolute right-8 top-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none origin-top-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEdit(emp._id || emp.id)
                                      setOpenActionMenuId(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FiEdit2 className="w-4 h-4" />
                                      <span>Edit</span>
                                    </div>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleExportSingle(emp)
                                      setOpenActionMenuId(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FiDownload className="w-4 h-4" />
                                      <span>Download</span>
                                    </div>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteClick(emp)
                                      setOpenActionMenuId(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FiTrash2 className="w-4 h-4" />
                                      <span>Delete</span>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmation && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-transparent dark:border-gray-800 transition-colors">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Confirm Delete</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {deleteConfirmation.fullName || `${deleteConfirmation.firstName || ''} ${deleteConfirmation.lastName || ''}`.trim() || deleteConfirmation.email}
                    </span>
                    ? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleDeleteCancel}
                      disabled={deleting}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Excel Modal */}
          {showImportModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-transparent dark:border-gray-800 transition-colors">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Employees from Excel</h3>
                    <button
                      onClick={() => {
                        setShowImportModal(false)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        setImportProgress({ total: 0, success: 0, failed: 0, errors: [] })
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Upload an Excel file (.xlsx, .xls) or CSV file with employee data. Required columns: <strong>First Name, Email, Phone, Employee ID</strong>
                    </p>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        disabled={importing}
                        className="hidden"
                        id="excel-upload"
                      />
                      <label
                        htmlFor="excel-upload"
                        className={`cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FiUpload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">
                          {importing ? 'Importing...' : 'Click to upload Excel file'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports .xlsx, .xls, .csv files
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Import Progress */}
                  {importProgress.total > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress: {importProgress.success + importProgress.failed} / {importProgress.total}</span>
                        <span className="text-green-600">Success: {importProgress.success}</span>
                        <span className="text-red-600">Failed: {importProgress.failed}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((importProgress.success + importProgress.failed) / importProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Details */}
                  {importProgress.errors.length > 0 && (
                    <div className="mb-4 max-h-40 overflow-y-auto">
                      <p className="text-sm font-semibold text-red-600 mb-2">Errors:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {importProgress.errors.slice(0, 10).map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                        {importProgress.errors.length > 10 && (
                          <li className="text-gray-500">... and {importProgress.errors.length - 10} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Excel Template Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Expected Excel Format:</p>
                    <div className="text-xs text-blue-800 space-y-1">
                      <p><strong>Required columns:</strong> First Name, Email, Phone, Employee ID</p>
                      <p><strong>Optional columns:</strong> Last Name, Middle Name, Role, Department, Designation, Location, Password (defaults to Temp[EmployeeID]123! if not provided)</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowImportModal(false)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        setImportProgress({ total: 0, success: 0, failed: 0, errors: [] })
                      }}
                      disabled={importing}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {importing ? 'Importing...' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Add Employee Form View
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Compact Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Back to List
            </button>
          </div>
        </div>


        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Basic Information */}
            <FormSection
              title="Basic Information"
              sectionId={1}
              isOpen={expandedSections.includes(1)}
              onToggle={() => toggleSection(1)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 1}
            >
              {/* Identity */}
              <FormField label="First Name" name="firstName" required formData={formData} handleChange={handleChange} />
              <FormField label="Middle Name" name="middleName" formData={formData} handleChange={handleChange} />
              <FormField label="Last Name" name="lastName" required formData={formData} handleChange={handleChange} />
              <FormField
                label="Employee Name"
                name="employeeName"
                formData={formData}
                handleChange={handleChange}
                readOnly
                className="bg-gray-100 cursor-not-allowed w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none"
              />
              <FormField label="Nick Name" name="nickName" formData={formData} handleChange={handleChange} />
              <FormField label="Gender" name="gender" type="select" required options={genders} formData={formData} handleChange={handleChange} />
              <FormField label="Blood Group" name="bloodGroup" formData={formData} handleChange={handleChange} />
              <FormField label="Marital Status" name="maritalStatus" type="select" options={maritalStatuses} formData={formData} handleChange={handleChange} />
              <FormField label="Marriage Date" name="marriageDate" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Date of Birth" name="dateOfBirth" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="DOB as per Aadhaar" name="birthdayDate" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Is Physically Challenged" name="isPhysicallyChallenged" type="checkbox" formData={formData} handleChange={handleChange} />

              {/* Contact */}
              <FormField label="Email" name="email" type="email" required formData={formData} handleChange={handleChange} />
              <FormField label="Office Mail ID" name="officeEmail" type="email" formData={formData} handleChange={handleChange} />
              <FormField label="Primary Contact" name="phone" type="tel" required formData={formData} handleChange={handleChange} />
              <FormField label="Secondary Contact" name="secondaryContact" type="tel" formData={formData} handleChange={handleChange} />

              {/* Address */}
              <FormField label="Present Address" name="presentAddress" type="textarea" required formData={formData} handleChange={handleChange} />
              <FormField label="Permanent Address" name="permanentAddress" type="textarea" formData={formData} handleChange={handleChange} />
              <FormField label="Country of Origin" name="countryOfOrigin" formData={formData} handleChange={handleChange} />
              <FormField label="Location (City)" name="cityLocation" formData={formData} handleChange={handleChange} />
              <FormField label="Is International Employee" name="isInternationalEmployee" type="checkbox" formData={formData} handleChange={handleChange} />

              {/* Emergency */}
              <FormField label="Emergency Contact Name" name="emergencyContactName" formData={formData} handleChange={handleChange} />
              <FormField label="Emergency Contact" name="emergencyContact" required formData={formData} handleChange={handleChange} />

              {/* Family */}
              <FormField label="Father's Name" name="fathersName" formData={formData} handleChange={handleChange} />
              <FormField label="Spouse Name" name="spouseName" formData={formData} handleChange={handleChange} />
              <FormField label="Spouse DOB" name="spouseDob" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Number of Children" name="numberOfChildren" type="number" min="0" formData={formData} handleChange={handleChildCountChange} />

              {/* Dynamic Children DOBs */}
              {formData.childrenDobs && formData.childrenDobs.map((dob, index) => (
                <div key={index}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Child {index + 1} DOB
                  </label>
                  <input
                    type="date"
                    value={dob || ''}
                    onChange={(e) => handleChildDobChange(index, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              ))}

              {/* System */}
              <FormField label="Employee ID" name="employeeId" required formData={formData} handleChange={handleChange} />
              <FormField label="Employee Ref Number" name="employeeRefNumber" formData={formData} handleChange={handleChange} />
              <FormField label="IP Address" name="ipAddress" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* Employment Information */}
            <FormSection
              title="Employment Information"
              sectionId={2}
              isOpen={expandedSections.includes(2)}
              onToggle={() => toggleSection(2)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 2}
            >
              <FormField label="Department" name="department" formData={formData} handleChange={handleChange} />
              <FormField label="Designation" name="designation" formData={formData} handleChange={handleChange} />
              <FormField label="Role" name="role" type="select" required options={roles} formData={formData} handleChange={handleChange} />
              <FormField label="Employee Status" name="employeeStatus" type="select" required options={['Active', 'Inactive']} formData={formData} handleChange={handleChange} />
              <FormField label="Joining Date" name="joiningDate" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Employee Exit Date" name="exitDate" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="CID" name="cid" formData={formData} handleChange={handleChange} />
              <FormField label="Manager ID" name="managerId" formData={formData} handleChange={handleChange} />
              <FormField label="Super Manager ID" name="superManagerId" formData={formData} handleChange={handleChange} />
              <FormField label="Confirm Date" name="confirmDate" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Probation Period (months)" name="probationPeriod" type="number" formData={formData} handleChange={handleChange} />
              <FormField label="Notice Period (days)" name="noticePeriod" type="number" formData={formData} handleChange={handleChange} />
              <FormField label="Division" name="division" formData={formData} handleChange={handleChange} />
              <FormField label="Cost Center" name="costCenter" formData={formData} handleChange={handleChange} />
              <FormField label="Grade" name="grade" formData={formData} handleChange={handleChange} />
              <FormField label="Location" name="location" formData={formData} handleChange={handleChange} />

              {/* Assigned Projects Multi-Select */}
              <div className="col-span-1 md:col-span-2 mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assign Projects
                </label>

                {/* Search Projects */}
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full px-2 py-1 mb-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
                />

                <div className="border border-gray-300 rounded-md p-2 h-32 overflow-y-auto bg-white">
                  {availableProjects.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-1">No active projects found.</p>
                  ) : (
                    availableProjects
                      .filter(p =>
                        p.projectName.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        p.projectId.toLowerCase().includes(projectSearchQuery.toLowerCase())
                      )
                      .map(project => (
                        <label key={project._id} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={formData.assignedProjects?.includes(project._id)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setFormData(prev => {
                                const current = prev.assignedProjects || []
                                return {
                                  ...prev,
                                  assignedProjects: checked
                                    ? [...current, project._id]
                                    : current.filter(id => id !== project._id)
                                }
                              })
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span className="text-xs text-gray-700">
                            {project.projectName} <span className="text-gray-400">({project.projectId})</span>
                          </span>
                        </label>
                      ))
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Select projects to assign this employee to.</p>
              </div>
            </FormSection>

            {/* Professional Information */}
            <FormSection
              title="Professional Information"
              sectionId={3}
              isOpen={expandedSections.includes(3)}
              onToggle={() => toggleSection(3)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 3}
            >
              <FormField label="Education" name="education" type="textarea" placeholder="Enter education details (Degree, Institution, Year)" formData={formData} handleChange={handleChange} />
              <FormField label="Experience" name="experience" type="textarea" placeholder="Enter work experience details (Company, Role, Duration)" formData={formData} handleChange={handleChange} />
              <FormField label="Skills" name="skills" placeholder="Enter skills (comma-separated)" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* Bank Details */}
            <FormSection
              title="Bank Details"
              sectionId={4}
              isOpen={expandedSections.includes(4)}
              onToggle={() => toggleSection(4)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 4}
            >
              <FormField label="Account Number" name="accountNumber" formData={formData} handleChange={handleChange} />
              <FormField label="Bank Name" name="bankName" formData={formData} handleChange={handleChange} />
              <FormField label="IFSC Code" name="ifscCode" formData={formData} handleChange={handleChange} />
              <FormField label="Account Type" name="accountType" type="select" options={accountTypes} formData={formData} handleChange={handleChange} />
              <FormField label="Branch Name" name="branchName" formData={formData} handleChange={handleChange} />

              <FormField label="Salary Payment Mode" name="salaryPaymentMode" type="select" options={paymentModes} formData={formData} handleChange={handleChange} />
              <FormField label="DD Payable At" name="ddPayableAt" formData={formData} handleChange={handleChange} />
              <FormField label="Name as per Bank Records" name="nameAsPerBankRecords" formData={formData} handleChange={handleChange} />
              <FormField label="IBAN" name="iban" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* Documents */}
            <FormSection
              title="Documents"
              sectionId={5}
              isOpen={expandedSections.includes(5)}
              onToggle={() => toggleSection(5)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 5}
            >
              <FormField label="Aadhar Number" name="aadharNumber" formData={formData} handleChange={handleChange} />
              <FormField label="PAN Number" name="panNumber" formData={formData} handleChange={handleChange} />
              <FormField label="Passport Number" name="passportNumber" formData={formData} handleChange={handleChange} />
              <FormField label="Driving License" name="drivingLicense" formData={formData} handleChange={handleChange} />
              <FormField label="Aadhaar Card Enrolment No" name="aadhaarCardEnrolmentNo" formData={formData} handleChange={handleChange} />
              <FormField label="Name (As on Aadhaar Card)" name="nameAsOnAadhaarCard" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* Background Verification */}
            <FormSection
              title="Background Verification"
              sectionId={6}
              isOpen={expandedSections.includes(6)}
              onToggle={() => toggleSection(6)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 6}
            >
              <FormField label="Status" name="verificationStatus" type="select" options={verificationStatuses} formData={formData} handleChange={handleChange} />
              <FormField label="Verification Indication" name="verificationIndication" formData={formData} handleChange={handleChange} />
              <FormField label="Completed On" name="completedOn" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Agency Name" name="agencyName" formData={formData} handleChange={handleChange} />
              <FormField label="Remarks" name="remarks" type="textarea" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* PF Details */}
            <FormSection
              title="PF Details"
              sectionId={7}
              isOpen={expandedSections.includes(7)}
              onToggle={() => toggleSection(7)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 7}
            >
              <FormField label="Is Employee Eligible for PF" name="isEligibleForPF" type="checkbox" formData={formData} handleChange={handleChange} />
              <FormField label="PF Number" name="pfNumber" formData={formData} handleChange={handleChange} />
              <FormField label="PF Scheme" name="pfScheme" formData={formData} handleChange={handleChange} />
              <FormField label="PF Joining Date" name="pfJoiningDate" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Eligible for Excess EPF Contribution" name="eligibleForExcessEPFContribution" type="checkbox" formData={formData} handleChange={handleChange} />
              <FormField label="Is Employee Eligible for Excess EPS Contribution" name="isEligibleForExcessEPSContribution" type="checkbox" formData={formData} handleChange={handleChange} />
              <FormField label="Is Existing Member of PF" name="isExistingMemberOfPF" type="checkbox" formData={formData} handleChange={handleChange} />
              <FormField label="Salary" name="salary" type="number" formData={formData} handleChange={handleChange} />
              <FormField label="Universal Account Number" name="universalAccountNumber" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* ESI Details */}
            <FormSection
              title="ESI Details"
              sectionId={8}
              isOpen={expandedSections.includes(8)}
              onToggle={() => toggleSection(8)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 8}
            >
              <FormField label="Is Employee Eligible for ESI" name="isEligibleForESI" type="checkbox" formData={formData} handleChange={handleChange} />
              <FormField label="ESI Number" name="esiNumber" formData={formData} handleChange={handleChange} />
              <FormField label="Is Covered Under LWF" name="isCoveredUnderLWF" type="checkbox" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* Account Setup */}
            <FormSection
              title="Account Setup"
              sectionId={9}
              isOpen={expandedSections.includes(9)}
              onToggle={() => toggleSection(9)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 9}
            >
              <FormField
                label="Password"
                name="password"
                type="password"
                required={!editingEmployee}
                placeholder={editingEmployee ? "Leave blank to keep current password" : "••••••••"}
                formData={formData}
                handleChange={handleChange}
              />

              {/* Profile Image Upload */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Profile Image (Max 300KB)
                </label>
                <div className="flex items-center gap-4">
                  {formData.profileImage && (
                    <img
                      src={formData.profileImage}
                      alt="Profile Preview"
                      className="w-16 h-16 rounded-full object-cover border border-gray-300"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      // 1. Validation: File Type
                      if (!['image/jpeg', 'image/png'].includes(file.type)) {
                        toast.error('Only JPEG and PNG images are allowed')
                        e.target.value = '' // Reset input
                        return
                      }

                      // 2. Validation: File Size (300KB limit)
                      const maxSize = 300 * 1024 // 300KB in bytes
                      if (file.size > maxSize) {
                        toast.error('Image size must be less than 300KB')
                        e.target.value = '' // Reset input
                        return
                      }

                      // 3. Convert to Base64
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, profileImage: reader.result }))
                        toast.success('Image uploaded successfully')
                      }
                      reader.onerror = () => {
                        toast.error('Failed to process image')
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
                {formData.profileImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, profileImage: '' }))
                      toast.success('Image removed')
                    }}
                    className="text-xs text-red-600 hover:text-red-800 mt-2 hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </FormSection>
          </div>

        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {deleteConfirmation.fullName || `${deleteConfirmation.firstName || ''} ${deleteConfirmation.lastName || ''}`.trim() || deleteConfirmation.email}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
