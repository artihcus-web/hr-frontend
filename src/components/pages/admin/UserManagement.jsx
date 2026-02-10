import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FiEdit2, FiTrash2, FiUpload, FiX, FiSearch, FiFilter, FiDownload, FiChevronDown, FiChevronUp, FiSave, FiPlus, FiMoreVertical } from 'react-icons/fi'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { countryCodes } from '../../../utils/countryCodes'
import axiosInstance from '../../../utils/axiosInstance'
import LoadingSpinner from '../../common/LoadingSpinner'

const roles = ['admin', 'c-suite', 'hr', 'manager', 'supermanager', 'tl', 'employee', 'client']
const genders = ['Male', 'Female', 'Other']
const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed']
const accountTypes = ['Savings', 'Current']
const paymentModes = ['Bank Transfer', 'Cheque', 'Cash']

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
const FormField = ({ label, name, type = 'text', required, formData, handleChange, options, placeholder, ...props }) => {
  // Helper to get nested value
  const getValue = (obj, path) => {
    if (!path || !obj) return ''
    if (path.includes('.')) {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj) || ''
    }
    return obj[path] || ''
  }

  const value = getValue(formData, name)

  return (
    <div className="flex flex-col">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
          {...props}
        >
          <option value="">Select {label}</option>
          {options.map((opt, index) => (
            <option key={index} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <div className="flex items-center">
          <input
            type="checkbox"
            name={name}
            checked={value === true}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded transition-colors"
          />
          <label className="ml-2 text-xs text-gray-700 dark:text-gray-300">{label}</label>
        </div>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
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
          value={value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          {...props}
        />
      )}
    </div>
  )
}

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

  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [isNewEntry, setIsNewEntry] = useState(false) // Track if this is a fresh entry creation flow
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
    email: '', // Personal Email
    alternativeEmail: '',
    officialEmail: '',
    phone: '',
    primaryCountryCode: '+91',
    secondaryCountryCode: '+91',
    employeeId: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    bloodGroup: '',
    emergencyContact: '',
    presentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
    permanentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
    aadhaarAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
    sameAsPresent: false, // UI state for checkbox
    aadhaarAddressOption: 'none', // 'present', 'permanent', 'none'
    emergencyContactName: '',
    emergencyContactNumber: '',
    isPhysicallyChallenged: false,
    physicallyChallengedDetails: '',
    isInternationalEmployee: false,
    countryOfOrigin: '',
    cityLocation: '',
    mobileNumber: '',
    familyDetails: [],

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
    education: [],
    languages: [],
    experience: '',
    salary: '',

    // Bank Details
    accountNumber: '',
    confirmAccountNumber: '',
    bankName: '',
    ifscCode: '',
    accountType: '',
    branchName: '',
    bankBranch: '',
    salaryPaymentMode: '',
    nameAsPerBankRecords: '',
    iban: '',
    swiftCode: '',

    // Documents
    // Documents
    documents: [],

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



  useEffect(() => {
    if (user && user.role === 'admin' && token && !showForm) {
      fetchEmployees()
    }
  }, [user, token, showForm, fetchEmployees])

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



  // Family Details Handlers
  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyDetails: [...prev.familyDetails, { name: '', relation: '', dob: '' }]
    }))
  }

  const removeFamilyMember = (index) => {
    setFormData(prev => ({
      ...prev,
      familyDetails: prev.familyDetails.filter((_, i) => i !== index)
    }))
  }

  const handleFamilyDetailChange = (index, field, value) => {
    setFormData(prev => {
      const newDetails = [...prev.familyDetails]
      newDetails[index] = { ...newDetails[index], [field]: value }
      return { ...prev, familyDetails: newDetails }
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

    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  // Address Copy Helpers
  const handleSameAsPresentChange = (e) => {
    const checked = e.target.checked
    setFormData(prev => ({
      ...prev,
      sameAsPresent: checked,
      permanentAddress: checked ? { ...prev.presentAddress } : prev.permanentAddress
    }))
  }

  const handleAadhaarAddressOptionChange = (e) => {
    const option = e.target.value
    setFormData(prev => {
      let newAddr = prev.aadhaarAddress
      if (option === 'present') newAddr = { ...prev.presentAddress }
      if (option === 'permanent') newAddr = { ...prev.permanentAddress }
      return {
        ...prev,
        aadhaarAddressOption: option,
        aadhaarAddress: newAddr
      }
    })
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
        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        firstName: emp.firstName || '',
        middleName: emp.middleName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        alternativeEmail: emp.alternativeEmail || '',
        officialEmail: emp.officialEmail || '',
        phone: emp.phone || '',
        primaryCountryCode: emp.primaryCountryCode || '+91',
        secondaryCountryCode: emp.secondaryCountryCode || '+91',
        employeeId: emp.employeeId || '',
        dateOfBirth: formatDate(emp.dateOfBirth),
        gender: emp.gender || '',
        maritalStatus: emp.maritalStatus || '',
        bloodGroup: emp.bloodGroup || '',
        emergencyContact: emp.emergencyContact || '',
        presentAddress: emp.presentAddress || { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
        permanentAddress: emp.permanentAddress || { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
        aadhaarAddress: emp.aadhaarAddress || { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
        nickName: emp.nickName || '',
        employeeRefNumber: emp.employeeRefNumber || '',
        birthdayDate: formatDate(emp.birthdayDate),
        marriageDate: formatDate(emp.marriageDate),
        fathersName: emp.fathersName || '',
        familyDetails: emp.familyDetails || [],
        secondaryContact: emp.secondaryContact || '',
        officeEmail: emp.officeEmail || '',
        spouseName: emp.spouseName || '',
        loginUsername: emp.loginUsername || emp.username || '',
        ipAddress: emp.ipAddress || '',
        // permanentAddress handled above
        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactNumber: emp.emergencyContactNumber || '',
        isPhysicallyChallenged: emp.isPhysicallyChallenged || false,
        physicallyChallengedDetails: emp.physicallyChallengedDetails || '',
        isInternationalEmployee: emp.isInternationalEmployee || false,
        countryOfOrigin: emp.countryOfOrigin || '',
        cityLocation: emp.cityLocation || '',
        mobileNumber: emp.mobileNumber || '',
        numberOfChildren: emp.numberOfChildren || 0,
        childrenDobs: Array.isArray(emp.childrenDobs) ? emp.childrenDobs.map(formatDate) : [],
        department: emp.department || '',
        designation: emp.designation || '',
        role: emp.role || 'employee',
        employeeStatus: emp.isActive === false ? 'Inactive' : 'Active', // Map isActive to employeeStatus
        joiningDate: formatDate(emp.joiningDate),
        exitDate: formatDate(emp.exitDate),
        cid: emp.cid || '',
        managerId: emp.managerId || '',
        businessUnitHR: emp.businessUnitHR || '',
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
        education: Array.isArray(emp.education) ? emp.education.map(edu => ({
          ...edu,
          fromDate: formatDate(edu.fromDate),
          toDate: formatDate(edu.toDate),
          fileName: edu.fileName || '',
          fileUrl: edu.fileUrl || ''
        })) : [],
        languages: Array.isArray(emp.languages) ? emp.languages : [],
        experience: Array.isArray(emp.experience) ? emp.experience : [],
        salary: emp.salary || '',
        accountNumber: emp.accountNumber || '',
        confirmAccountNumber: emp.accountNumber || '',
        bankName: emp.bankName || '',
        ifscCode: emp.ifscCode || '',
        accountType: emp.accountType || '',
        branchName: emp.branchName || '',
        bankBranch: emp.bankBranch || '',
        salaryPaymentMode: emp.salaryPaymentMode || '',
        ddPayableAt: emp.ddPayableAt || '',
        nameAsPerBankRecords: emp.nameAsPerBankRecords || '',
        iban: emp.iban || '',
        swiftCode: emp.swiftCode || '',
        documents: Array.isArray(emp.documents) ? emp.documents : [],
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

  // Account Number Masking State
  const [isAccountNumberFocused, setIsAccountNumberFocused] = useState(false)

  const getMaskedAccountNumber = (number) => {
    if (!number) return ''
    if (number.length <= 3) return number
    const visibleDigits = 3
    const maskedLength = number.length - visibleDigits
    return '•'.repeat(maskedLength) + number.slice(-visibleDigits)
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

            // Handle Professional Info - Legacy Support for Excel Import
            if (employee.skills && typeof employee.skills === 'string') {
              employee.skills = employee.skills.split(',').map(s => s.trim())
            } else if (!Array.isArray(employee.skills)) {
              employee.skills = []
            }

            if (employee.education && typeof employee.education === 'string') {
              // Best effort: just put the whole string in 'institute'
              employee.education = [{ institute: employee.education, fromDate: null, toDate: null }]
            } else if (!Array.isArray(employee.education)) {
              employee.education = []
            }

            if (employee.experience && typeof employee.experience === 'string') {
              // Best effort: just put the whole string in 'organization'
              employee.experience = [{ organization: employee.experience, fromDate: null, toDate: null }]
            } else if (!Array.isArray(employee.experience)) {
              employee.experience = []
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
      employeeName: '',
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      primaryCountryCode: '+91',
      secondaryCountryCode: '+91',
      employeeId: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      bloodGroup: '',
      emergencyContact: '',
      presentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
      permanentAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
      aadhaarAddress: { line1: '', line2: '', pincode: '', district: '', state: '', country: '' },
      sameAsPresent: false,
      aadhaarAddressOption: 'none',
      nickName: '',
      employeeRefNumber: '',
      birthdayDate: '',
      marriageDate: '',
      fathersName: '',
      spouseName: '',
      spouseDob: '',
      loginUsername: '',
      ipAddress: '',
      // permanentAddress handled above
      emergencyContactName: '',
      emergencyContactNumber: '',
      isPhysicallyChallenged: false,
      physicallyChallengedDetails: '',
      isInternationalEmployee: false,
      countryOfOrigin: '',
      cityLocation: '',
      mobileNumber: '',
      numberOfChildren: 0,
      childrenDobs: [],
      familyDetails: [],
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
      education: [],
      languages: [],
      experience: [],
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
      if (!formData.lastName) missingFields.push('Last Name')
      if (!formData.email) missingFields.push('Email')
      if (!formData.phone) missingFields.push('Phone')
      if (!formData.employeeId) missingFields.push('Employee ID')
      // Note: Password validation removed here to allow 'Draft' creation with temp password

      if (missingFields.length > 0) {
        toast.error(`Initial creation requires: ${missingFields.join(', ')}`)
        return
      }
    } else {
      // For updates, at least ensure ID and Official Email aren't wiped accidentally
      if (!formData.employeeId) {
        toast.error('Employee ID is required')
        return
      }
    }



    // Enforce permanent password for Account Setup section (Section 8) if it's a new entry
    if (sectionId === 8 && isNewEntry && !formData.password) {
      toast.error('Please set a permanent password for the new account')
      return
    }

    // Account Number Validation
    if (sectionId === 4 && formData.accountNumber !== formData.confirmAccountNumber) {
      toast.error('Account Number and Confirm Account Number do not match')
      return
    }

    setSubmittingSection(sectionId)

    try {
      // Prepare data for API (map to backend expected format)
      const apiData = {
        username: formData.loginUsername || formData.employeeId,
        email: formData.email,
        officialEmail: formData.officialEmail,
        alternativeEmail: formData.alternativeEmail,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        role: formData.role,
        // Map employeeStatus (Active/Inactive) to isActive (boolean)
        isActive: formData.employeeStatus === 'Active',
        // Include all other fields
        ...formData
      }

      // Only include password if provided (for new employees or password change)
      if (formData.password) {
        apiData.password = formData.password
      } else if (!editingEmployee) {
        // Generate temp password for 'Draft' creation so other info can be saved first
        const tempPass = `Temp@${formData.phone ? formData.phone.slice(-4) : '1234'}`
        apiData.password = tempPass
        toast('Draft created. Temporary password set.', { icon: 'ℹ️' })
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

  // Handle Probation Actions
  const handleProbationAction = async (action) => {
    if (!editingEmployee || !formData.joiningDate || !formData.probationPeriod) return

    // Calculate confirmation date (today)
    const confirmDate = new Date().toISOString().split('T')[0]

    try {
      if (action === 'accept') {
        const updatedData = { ...formData, confirmDate }
        setFormData(updatedData) // specific update to UI state
        // We can either auto-save or just set state. User requested "confirm the emp there itself".
        // Let's call the API to save immediately.
        await axiosInstance.put(`/api/auth/users/${editingEmployee}`, { ...updatedData, role: formData.role }) // role is required field
        toast.success(`Probation confirmed. Employee confirmed on ${confirmDate}.`)
        await fetchEmployees()
      } else if (action === 'reject') {
        // Reject implies failing probation -> Inactive or Terminated.
        // User said "reject the emp".
        if (window.confirm("Are you sure you want to reject this employee's probation? This will set their status to Inactive.")) {
          const updatedData = { ...formData, employeeStatus: 'Inactive' }
          setFormData(updatedData)
          await axiosInstance.put(`/api/auth/users/${editingEmployee}`, { ...updatedData, role: formData.role })
          toast.success("Probation rejected. Employee status set to Inactive.")
          await fetchEmployees()
        }
      }
    } catch (error) {
      console.error('Probation action failed:', error)
      toast.error('Failed to update probation status')
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
      (filterStatus === 'probation' && !emp.confirmDate && emp.isActive !== false) ||
      (filterStatus === 'confirmed' && emp.confirmDate && emp.isActive !== false)

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
                    setIsNewEntry(true) // Start new entry flow
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
                  <option value="probation">Probation</option>
                  <option value="confirmed">Confirmed</option>
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
                                  {emp.officialEmail || emp.email || 'No email'}
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
                                      setIsNewEntry(false) // Not a new entry
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
                                  {emp.isActive !== false && (
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
                                  )}
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
            {/* Basic Information (Refined) */}
            <FormSection
              title="Basic Information"
              sectionId={1}
              isOpen={expandedSections.includes(1)}
              onToggle={() => toggleSection(1)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 1}
            >
              {/* Employee Name - Read Only Display */}
              <div className="col-span-full">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Employee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="employeeName"
                  value={formData.employeeName || ''}
                  readOnly
                  className="w-full px-3 py-2 text-base font-bold border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-default focus:outline-none"
                />
              </div>

              {/* Name Parts Inputs */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="First Name"
                  name="firstName"
                  required
                  formData={formData}
                  handleChange={handleChange}
                  placeholder="First Name"
                />
                <FormField
                  label="Middle Name"
                  name="middleName"
                  formData={formData}
                  handleChange={handleChange}
                  placeholder="Middle Name"
                />
                <FormField
                  label="Last Name"
                  name="lastName"
                  required
                  formData={formData}
                  handleChange={handleChange}
                  placeholder="Last Name"
                />
              </div>

              {/* Row 2: Gender & Blood Group */}
              <FormField label="Gender" name="gender" type="select" required options={genders} formData={formData} handleChange={handleChange} />
              <FormField label="Blood Group" name="bloodGroup" type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} formData={formData} handleChange={handleChange} />

              {/* Row 3: DOBs */}
              <FormField label="DOB as per Aadhaar" name="birthdayDate" type="date" formData={formData} handleChange={handleChange} />
              <FormField label="Date of Birth (Actual)" name="dateOfBirth" type="date" formData={formData} handleChange={handleChange} />

              {/* Row 4: Marital Status */}
              <FormField label="Marital Status" name="maritalStatus" type="select" options={maritalStatuses} formData={formData} handleChange={handleChange} />
              <FormField label="Marriage Date" name="marriageDate" type="date" formData={formData} handleChange={handleChange} />

              {/* Physically Challenged - Conditional */}
              <div className="col-span-full">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="isPhysicallyChallenged"
                    name="isPhysicallyChallenged"
                    checked={formData.isPhysicallyChallenged || false}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPhysicallyChallenged" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Is Physically Challenged?
                  </label>
                </div>

                {formData.isPhysicallyChallenged && (
                  <div className="mt-2 animate-fadeIn">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Details (Please specify)
                    </label>
                    <textarea
                      name="physicallyChallengedDetails"
                      value={formData.physicallyChallengedDetails || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Provide details about the physical challenge..."
                    />
                  </div>
                )}
              </div>
            </FormSection>

            {/* Contact Information (New Section) */}
            <FormSection
              title="Contact Information"
              sectionId={12}
              isOpen={expandedSections.includes(12)}
              onToggle={() => toggleSection(12)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 12}
            >
              {/* Primary Contact */}
              <div className="col-span-full md:col-span-1 flex gap-2 w-full">
                <div className="w-1/2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                  <select
                    name="primaryCountryCode"
                    value={formData.primaryCountryCode || '+91'}
                    onChange={handleChange}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {countryCodes.map((country, index) => (
                      <option key={`${country.code}-${index}`} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <FormField label="Primary Contact" name="phone" type="tel" required formData={formData} handleChange={handleChange} />
                </div>
              </div>

              {/* Secondary Contact */}
              <div className="col-span-full md:col-span-1 flex gap-2 w-full">
                <div className="w-1/2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                  <select
                    name="secondaryCountryCode"
                    value={formData.secondaryCountryCode || '+91'}
                    onChange={handleChange}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {countryCodes.map((country, index) => (
                      <option key={`${country.code}-${index}`} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <FormField label="Secondary Contact" name="secondaryContact" type="tel" formData={formData} handleChange={handleChange} />
                </div>
              </div>

              {/* Emergency Contact */}
              <FormField label="Emergency Contact Number" name="emergencyContact" required formData={formData} handleChange={handleChange} />
              <FormField label="Emergency Contact Name" name="emergencyContactName" required formData={formData} handleChange={handleChange} />

              {/* Emails */}
              <FormField label="Personal Email ID" name="email" type="email" formData={formData} handleChange={handleChange} />
              <FormField label="Alternative Email ID" name="alternativeEmail" type="email" formData={formData} handleChange={handleChange} />

            </FormSection>

            {/* Communication Details (Refined) */}
            <FormSection
              title="Communication Details"
              sectionId={16}
              isOpen={expandedSections.includes(16)}
              onToggle={() => toggleSection(16)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 16}
            >
              {/* Present Address */}
              <div className="col-span-full mt-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-1">Present Address</h4>
              </div>
              <div className="col-span-full">
                <FormField label="Address Line 1" name="presentAddress.line1" required formData={formData} handleChange={handleChange} />
              </div>
              <div className="col-span-full">
                <FormField label="Address Line 2" name="presentAddress.line2" formData={formData} handleChange={handleChange} />
              </div>
              <FormField label="City" name="presentAddress.district" required formData={formData} handleChange={handleChange} />
              <FormField label="State/Province/Region" name="presentAddress.state" required formData={formData} handleChange={handleChange} />
              <FormField label="ZIP/Postal Code" name="presentAddress.pincode" required formData={formData} handleChange={handleChange} />
              <FormField label="Country" name="presentAddress.country" required formData={formData} handleChange={handleChange} />

              {/* Permanent Address */}
              <div className="col-span-full mt-4 mb-2 flex flex-col md:flex-row md:items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Permanent Address</h4>
                <div className="flex items-center mt-2 md:mt-0">
                  <input
                    type="checkbox"
                    id="sameAsPresent"
                    checked={formData.sameAsPresent}
                    onChange={handleSameAsPresentChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sameAsPresent" className="ml-2 text-xs text-gray-600 dark:text-gray-400">Same as Present Address</label>
                </div>
              </div>
              <div className="col-span-full">
                <FormField label="Address Line 1" name="permanentAddress.line1" required formData={formData} handleChange={handleChange} />
              </div>
              <div className="col-span-full">
                <FormField label="Address Line 2" name="permanentAddress.line2" formData={formData} handleChange={handleChange} />
              </div>
              <FormField label="City" name="permanentAddress.district" required formData={formData} handleChange={handleChange} />
              <FormField label="State/Province/Region" name="permanentAddress.state" required formData={formData} handleChange={handleChange} />
              <FormField label="ZIP/Postal Code" name="permanentAddress.pincode" required formData={formData} handleChange={handleChange} />
              <FormField label="Country" name="permanentAddress.country" required formData={formData} handleChange={handleChange} />

              {/* Address as per Aadhaar */}
              <div className="col-span-full mt-4 mb-2 flex flex-col md:flex-row md:items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Address as per Aadhaar</h4>
                <div className="flex flex-wrap gap-4 mt-2 md:mt-0 text-xs text-gray-600 dark:text-gray-400">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="aadhaarAddressOption" value="present" checked={formData.aadhaarAddressOption === 'present'} onChange={handleAadhaarAddressOptionChange} className="mr-1" />
                    Same as Present
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="aadhaarAddressOption" value="permanent" checked={formData.aadhaarAddressOption === 'permanent'} onChange={handleAadhaarAddressOptionChange} className="mr-1" />
                    Same as Permanent
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="aadhaarAddressOption" value="none" checked={formData.aadhaarAddressOption === 'none'} onChange={handleAadhaarAddressOptionChange} className="mr-1" />
                    Other
                  </label>
                </div>
              </div>
              <div className="col-span-full">
                <FormField label="Address Line 1" name="aadhaarAddress.line1" required formData={formData} handleChange={handleChange} disabled={formData.aadhaarAddressOption !== 'none'} />
              </div>
              <div className="col-span-full">
                <FormField label="Address Line 2" name="aadhaarAddress.line2" formData={formData} handleChange={handleChange} disabled={formData.aadhaarAddressOption !== 'none'} />
              </div>
              <FormField label="City" name="aadhaarAddress.district" required formData={formData} handleChange={handleChange} disabled={formData.aadhaarAddressOption !== 'none'} />
              <FormField label="State/Province/Region" name="aadhaarAddress.state" required formData={formData} handleChange={handleChange} disabled={formData.aadhaarAddressOption !== 'none'} />
              <FormField label="ZIP/Postal Code" name="aadhaarAddress.pincode" required formData={formData} handleChange={handleChange} disabled={formData.aadhaarAddressOption !== 'none'} />
              <FormField label="Country" name="aadhaarAddress.country" required formData={formData} handleChange={handleChange} disabled={formData.aadhaarAddressOption !== 'none'} />


            </FormSection>

            {/* Family Details (New Section) */}
            <FormSection
              title="Family Details"
              sectionId={13}
              isOpen={expandedSections.includes(13)}
              onToggle={() => toggleSection(13)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 13}
            >
              {/* Header */}
              <div className="col-span-full hidden md:grid md:grid-cols-12 gap-4 mb-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
                <div className="col-span-4">Name</div>
                <div className="col-span-4">Relationship</div>
                <div className="col-span-3">DOB</div>
                <div className="col-span-1">Action</div>
              </div>

              {(formData.familyDetails || []).map((member, index) => (
                <div key={index} className="col-span-full grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end border-b pb-4 md:border-0 md:pb-0">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 md:hidden">Name</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => handleFamilyDetailChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 md:hidden">Relationship</label>
                    {(() => {
                      const relationshipOptions = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister']
                      const isCustom = member.relation && !relationshipOptions.includes(member.relation)

                      return (
                        <div className="space-y-2">
                          <select
                            value={isCustom || member.relation === 'Other' ? 'Other' : member.relation}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === 'Other') {
                                handleFamilyDetailChange(index, 'relation', 'Other')
                              } else {
                                handleFamilyDetailChange(index, 'relation', val)
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">Select Relationship</option>
                            {relationshipOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            <option value="Other">Other (Specify)</option>
                          </select>

                          {(isCustom || member.relation === 'Other') && (
                            <input
                              type="text"
                              placeholder="Specify Relationship"
                              value={member.relation === 'Other' ? '' : member.relation}
                              onChange={(e) => handleFamilyDetailChange(index, 'relation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              autoFocus={member.relation === 'Other'}
                            />
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 md:hidden">DOB</label>
                    <input
                      type="date"
                      value={member.dob ? new Date(member.dob).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleFamilyDetailChange(index, 'dob', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <div className="col-span-full mt-2">
                <button
                  type="button"
                  onClick={addFamilyMember}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add
                </button>
              </div>
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
              <div className="col-span-full">
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-indigo-500 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Official Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="officialEmail"
                  value={formData.officialEmail || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-indigo-500 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="official.email@company.com"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This email will be used for login and all system notifications
                </p>
              </div>

              <FormField label="Designation" name="designation" formData={formData} handleChange={handleChange} />
              <FormField label="Role" name="role" type="select" required options={roles} formData={formData} handleChange={handleChange} />
              <FormField label="Department/Business Unit" name="businessUnitHR" type="select" options={['BU1', 'BU2', 'BU3']} formData={formData} handleChange={handleChange} />
              <FormField label="Employee Status" name="employeeStatus" type="select" required options={['Active', 'Inactive']} formData={formData} handleChange={handleChange} />
              <FormField label="Joining Date" name="joiningDate" type="date" formData={formData} handleChange={handleChange} />
              <div className="col-span-1">
                <FormField label="Probation Period (days)" name="probationPeriod" type="number" formData={formData} handleChange={handleChange} />
                {(() => {
                  // Probation Action Logic
                  if (formData.joiningDate && formData.probationPeriod && !formData.confirmDate) {
                    const joinDate = new Date(formData.joiningDate)
                    const probDays = parseInt(formData.probationPeriod) || 0
                    const probationEndDate = new Date(joinDate)
                    probationEndDate.setDate(joinDate.getDate() + probDays)
                    const today = new Date()
                    // If Today >= Probation End Date
                    // Reset time parts for accurate date comparison
                    today.setHours(0, 0, 0, 0)
                    probationEndDate.setHours(0, 0, 0, 0)

                    if (today >= probationEndDate) {
                      return (
                        <div className="mt-2 flex gap-2 animate-fadeIn">
                          <button
                            type="button"
                            onClick={() => handleProbationAction('accept')}
                            className="flex-1 bg-green-600 text-white text-xs font-bold py-1.5 px-2 rounded hover:bg-green-700 transition-colors shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProbationAction('reject')}
                            className="flex-1 bg-red-600 text-white text-xs font-bold py-1.5 px-2 rounded hover:bg-red-700 transition-colors shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )
                    }
                  }
                  return null
                })()}
              </div>
              <FormField label="Employee Exit Date" name="exitDate" type="date" formData={formData} handleChange={handleChange} />

              <FormField label="Confirm Date" name="confirmDate" type="date" formData={formData} handleChange={handleChange} />

              <FormField label="Cost Center" name="costCenter" formData={formData} handleChange={handleChange} />

            </FormSection>



            {/* Education Details */}
            <FormSection
              title="Education Details"
              sectionId={3}
              isOpen={expandedSections.includes(3)}
              onToggle={() => toggleSection(3)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 3}
            >
              <div className="col-span-full">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Qualifications</h4>
                {formData.education && formData.education.map((edu, index) => (
                  <div key={index} className="flex flex-col gap-4 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const newEducation = formData.education.filter((_, i) => i !== index)
                        setFormData({ ...formData, education: newEducation })
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Institute Name</label>
                        <input
                          type="text"
                          value={edu.institute || ''}
                          onChange={(e) => {
                            const newEducation = [...formData.education]
                            newEducation[index].institute = e.target.value
                            setFormData({ ...formData, education: newEducation })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Enter Institute Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Degree / Qualification</label>
                        <select
                          value={edu.degree || ''}
                          onChange={(e) => {
                            const newEducation = [...formData.education]
                            newEducation[index].degree = e.target.value
                            setFormData({ ...formData, education: newEducation })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">Select Degree</option>
                          <option value="SSC">SSC / 10th</option>
                          <option value="Intermediate">Intermediate / 12th</option>
                          <option value="Diploma">Diploma</option>
                          <option value="UG">UG (Undergraduate)</option>
                          <option value="PG">PG (Postgraduate)</option>
                          <option value="PhD">PhD</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Percentage / CGPA</label>
                        <input
                          type="text"
                          value={edu.percentage || ''}
                          onChange={(e) => {
                            const newEducation = [...formData.education]
                            newEducation[index].percentage = e.target.value
                            setFormData({ ...formData, education: newEducation })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g. 85% or 8.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                        <input
                          type="date"
                          value={edu.fromDate ? edu.fromDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const newEducation = [...formData.education]
                            newEducation[index].fromDate = e.target.value
                            setFormData({ ...formData, education: newEducation })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                        <input
                          type="date"
                          value={edu.toDate ? edu.toDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const newEducation = [...formData.education]
                            newEducation[index].toDate = e.target.value
                            setFormData({ ...formData, education: newEducation })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Attachment</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                              const newEducation = [...formData.education]
                              newEducation[index].fileName = file.name
                              // Ideally upload logic here
                              setFormData({ ...formData, education: newEducation })
                              toast.success(`Selected: ${file.name}`)
                            }
                          }}
                          className="text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {edu.fileName && <span className="text-xs text-gray-500 truncate max-w-[100px]">{edu.fileName}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, education: [...(formData.education || []), { institute: '', degree: '', percentage: '', fromDate: '', toDate: '', fileName: '', fileUrl: '' }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-6"
                >
                  <FiPlus className="w-4 h-4" /> Add Qualification
                </button>

                {/* Languages Section */}
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 border-t pt-4">Languages Known</h4>
                {formData.languages && formData.languages.map((lang, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-4 mb-2 items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={lang.name || ''}
                        onChange={(e) => {
                          const newLangs = [...formData.languages]
                          newLangs[index].name = e.target.value
                          setFormData({ ...formData, languages: newLangs })
                        }}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Language (e.g. English)"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={lang.read || false}
                          onChange={(e) => {
                            const newLangs = [...formData.languages]
                            newLangs[index].read = e.target.checked
                            setFormData({ ...formData, languages: newLangs })
                          }}
                          className="mr-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        /> Read
                      </label>
                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={lang.write || false}
                          onChange={(e) => {
                            const newLangs = [...formData.languages]
                            newLangs[index].write = e.target.checked
                            setFormData({ ...formData, languages: newLangs })
                          }}
                          className="mr-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        /> Write
                      </label>
                      <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={lang.speak || false}
                          onChange={(e) => {
                            const newLangs = [...formData.languages]
                            newLangs[index].speak = e.target.checked
                            setFormData({ ...formData, languages: newLangs })
                          }}
                          className="mr-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        /> Speak
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newLangs = formData.languages.filter((_, i) => i !== index)
                        setFormData({ ...formData, languages: newLangs })
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, languages: [...(formData.languages || []), { name: '', read: false, write: false, speak: false }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Language
                </button>
              </div>
            </FormSection>

            {/* Experience Details */}
            <FormSection
              title="Experience Details"
              sectionId={10}
              isOpen={expandedSections.includes(10)}
              onToggle={() => toggleSection(10)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 10}
            >
              <div className="col-span-full">
                {formData.experience && formData.experience.map((exp, index) => (
                  <div key={index} className="flex flex-col gap-4 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const newExperience = formData.experience.filter((_, i) => i !== index)
                        setFormData({ ...formData, experience: newExperience })
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Organization</label>
                        <input
                          type="text"
                          value={exp.organization || ''}
                          onChange={(e) => {
                            const newExperience = [...formData.experience]
                            newExperience[index].organization = e.target.value
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Enter Organization Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Position / Designation</label>
                        <input
                          type="text"
                          value={exp.designation || ''}
                          onChange={(e) => {
                            const newExperience = [...formData.experience]
                            newExperience[index].designation = e.target.value
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Enter Designation"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                        <input
                          type="date"
                          value={exp.fromDate ? exp.fromDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const newExperience = [...formData.experience]
                            newExperience[index].fromDate = e.target.value
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                        <input
                          type="date"
                          value={exp.toDate ? exp.toDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const newExperience = [...formData.experience]
                            newExperience[index].toDate = e.target.value
                            setFormData({ ...formData, experience: newExperience })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, experience: [...(formData.experience || []), { organization: '', designation: '', fromDate: '', toDate: '' }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Experience
                </button>
              </div>
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
              {/* Custom Account Number Field with Masking */}
              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={isAccountNumberFocused ? formData.accountNumber : getMaskedAccountNumber(formData.accountNumber)}
                  onChange={handleChange}
                  onFocus={() => setIsAccountNumberFocused(true)}
                  onBlur={() => setIsAccountNumberFocused(false)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter Account Number"
                />
              </div>

              {/* Custom Confirm Account Number Field with Validation */}
              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Account Number
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="confirmAccountNumber"
                    value={formData.confirmAccountNumber || ''}
                    onChange={handleChange}
                    className={`w-full px-2.5 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 transition-colors ${formData.confirmAccountNumber && formData.accountNumber
                      ? formData.accountNumber === formData.confirmAccountNumber
                        ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                        : 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    placeholder="Re-enter Account Number"
                  />
                  {formData.confirmAccountNumber && formData.accountNumber && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {formData.accountNumber === formData.confirmAccountNumber ? (
                        <span className="text-green-500 text-xs font-semibold">Confirmed</span>
                      ) : (
                        <span className="text-red-500 text-xs font-semibold">Mismatch</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <FormField label="Bank Name" name="bankName" formData={formData} handleChange={handleChange} />
              <FormField label="IFSC Code" name="ifscCode" formData={formData} handleChange={handleChange} />
              <FormField label="Account Type" name="accountType" type="select" options={accountTypes} formData={formData} handleChange={handleChange} />
              <FormField label="Branch Name" name="branchName" formData={formData} handleChange={handleChange} />

              <FormField label="Salary Payment Mode" name="salaryPaymentMode" type="select" options={paymentModes} formData={formData} handleChange={handleChange} />
              <FormField label="Name as per Bank Records" name="nameAsPerBankRecords" formData={formData} handleChange={handleChange} />
              <FormField label="IBAN" name="iban" formData={formData} handleChange={handleChange} />
              <FormField label="Swift Code" name="swiftCode" formData={formData} handleChange={handleChange} />
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
              <div className="col-span-full">
                {formData.documents && formData.documents.map((doc, index) => (
                  <div key={index} className="flex flex-col gap-4 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const newDocs = formData.documents.filter((_, i) => i !== index)
                        setFormData({ ...formData, documents: newDocs })
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 p-1"
                      title="Remove"
                    >
                      <FiX className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type <span className="text-red-500">*</span></label>
                        <select
                          value={doc.documentType || ''}
                          onChange={(e) => {
                            const newDocs = [...formData.documents]
                            newDocs[index].documentType = e.target.value
                            setFormData({ ...formData, documents: newDocs })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Select Type</option>
                          <option value="Aadhar Card">Aadhar Card</option>
                          <option value="PAN Card">PAN Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                          <option value="Voter ID">Voter ID</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Document Number <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={doc.documentNumber || ''}
                          onChange={(e) => {
                            const newDocs = [...formData.documents]
                            newDocs[index].documentNumber = e.target.value
                            setFormData({ ...formData, documents: newDocs })
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Enter Number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Attachment</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) {
                                const newDocs = [...formData.documents]
                                newDocs[index].fileName = file.name
                                // Ideally upload logic here, currently storing just name for display
                                setFormData({ ...formData, documents: newDocs })
                                toast.success(`Selected: ${file.name}`)
                              }
                            }}
                            className="text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          />
                          {doc.fileName && <span className="text-xs text-gray-500 truncate max-w-[100px]">{doc.fileName}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, documents: [...(formData.documents || []), { documentType: '', documentNumber: '', fileName: '' }] })}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <FiPlus className="w-4 h-4" /> Add Document
                </button>
              </div>
            </FormSection>

            {/* PF Details */}
            <FormSection
              title="PF Details"
              sectionId={6}
              isOpen={expandedSections.includes(6)}
              onToggle={() => toggleSection(6)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 6}
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
              sectionId={7}
              isOpen={expandedSections.includes(7)}
              onToggle={() => toggleSection(7)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 7}
            >
              <FormField label="Is Employee Eligible for ESI" name="isEligibleForESI" type="checkbox" formData={formData} handleChange={handleChange} />
              <FormField label="ESI Number" name="esiNumber" formData={formData} handleChange={handleChange} />
              <FormField label="Is Covered Under LWF" name="isCoveredUnderLWF" type="checkbox" formData={formData} handleChange={handleChange} />
            </FormSection>

            {/* Account Setup */}
            <FormSection
              title="Account Setup"
              sectionId={8}
              isOpen={expandedSections.includes(8)}
              onToggle={() => toggleSection(8)}
              onSave={handleSubmit}
              isSubmitting={submittingSection === 8}
            >
              <FormField
                label="Password"
                name="password"
                type="password"
                required={!editingEmployee || isNewEntry}
                placeholder={(!editingEmployee || isNewEntry) ? "Enter password" : "Leave blank to keep current password"}
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
      </div >

      {/* Delete Confirmation Modal */}
      {
        deleteConfirmation && (
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
        )
      }
    </div >
  )
}

export default UserManagement
