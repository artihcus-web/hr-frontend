/**
 * Generates Employee_Import_Template.xlsx with 2 rows:
 * - Row 1: Only required fields (First Name, Official Email ID, Phone, Employee ID, Role)
 * - Row 2: ALL schema fields filled with type-appropriate dummy data for import testing
 *
 * Run: node scripts/generate-import-sample.js
 */
/* eslint-env node */
/* global process */

import ExcelJS from 'exceljs'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const REQUIRED_KEYS = new Set(['firstName', 'officialEmail', 'phone', 'employeeId', 'role'])

// All columns matching schema labels (from migrateEmployeeForm) + import flat keys for education/experience/family
const COLUMNS = [
  // Basic
  { key: 'firstName', header: 'First Name', type: 'text' },
  { key: 'middleName', header: 'Middle Name', type: 'text' },
  { key: 'lastName', header: 'Last Name', type: 'text' },
  { key: 'gender', header: 'Gender', type: 'select' },
  { key: 'bloodGroup', header: 'Blood Group', type: 'select' },
  { key: 'birthdayDate', header: 'DOB as per Aadhaar', type: 'date' },
  { key: 'dateOfBirth', header: 'Date of Birth (Actual)', type: 'date' },
  { key: 'maritalStatus', header: 'Marital Status', type: 'select' },
  { key: 'marriageDate', header: 'Marriage Date', type: 'date' },
  { key: 'isPhysicallyChallenged', header: 'Physically Challenged', type: 'checkbox' },
  { key: 'physicallyChallengedDetails', header: 'Physically Challenged Details', type: 'text' },
  { key: 'isInternationalEmployee', header: 'International Employee', type: 'checkbox' },
  { key: 'countryOfOrigin', header: 'Country of Origin', type: 'text' },
  { key: 'cityLocation', header: 'City Location', type: 'text' },
  // Contact
  { key: 'primaryCountryCode', header: 'Primary Country Code', type: 'text' },
  { key: 'phone', header: 'Phone Number', type: 'tel' },
  { key: 'secondaryCountryCode', header: 'Secondary Country Code', type: 'text' },
  { key: 'secondaryContact', header: 'Secondary Contact', type: 'tel' },
  { key: 'emergencyCountryCode', header: 'Emergency Country Code', type: 'text' },
  { key: 'emergencyContact', header: 'Emergency Contact', type: 'tel' },
  { key: 'emergencyContactName', header: 'Emergency Contact Name', type: 'text' },
  { key: 'email', header: 'Personal Email ID', type: 'email' },
  { key: 'alternativeEmail', header: 'Alternative Email ID', type: 'email' },
  { key: 'mobileNumber', header: 'Mobile Number', type: 'tel' },
  // Address – present
  { key: 'presentAddress.line1', header: 'Present Address Line 1', type: 'text' },
  { key: 'presentAddress.line2', header: 'Present Address Line 2', type: 'text' },
  { key: 'presentAddress.district', header: 'City', type: 'text' },
  { key: 'presentAddress.state', header: 'State/Province/Region', type: 'text' },
  { key: 'presentAddress.pincode', header: 'ZIP/Postal Code', type: 'text' },
  { key: 'presentAddress.country', header: 'Country', type: 'text' },
  // Address – permanent
  { key: 'permanentAddress.line1', header: 'Permanent Address Line 1', type: 'text' },
  { key: 'permanentAddress.line2', header: 'Permanent Address Line 2', type: 'text' },
  { key: 'permanentAddress.district', header: 'Permanent City', type: 'text' },
  { key: 'permanentAddress.state', header: 'Permanent State/Province/Region', type: 'text' },
  { key: 'permanentAddress.pincode', header: 'Permanent ZIP/Postal Code', type: 'text' },
  { key: 'permanentAddress.country', header: 'Permanent Country', type: 'text' },
  // Family (flat → import builds familyDetails[])
  { key: 'familyMemberName', header: 'Family Member Name', type: 'text' },
  { key: 'relation', header: 'Relationship', type: 'text' },
  { key: 'familyDob', header: 'Family DOB', type: 'date' },
  // Employment
  { key: 'employeeId', header: 'Employee ID', type: 'alphanumeric' },
  { key: 'officialEmail', header: 'Official Email ID', type: 'email' },
  { key: 'businessUnitHR', header: 'Department/Business Unit', type: 'select' },
  { key: 'designation', header: 'Designation', type: 'text' },
  { key: 'role', header: 'Role', type: 'select' },
  { key: 'employeeStatus', header: 'Employee Status', type: 'select' },
  { key: 'joiningDate', header: 'Joining Date', type: 'date' },
  { key: 'probationPeriod', header: 'Probation Period (days)', type: 'number' },
  { key: 'costCenter', header: 'Cost Center', type: 'text' },
  { key: 'department', header: 'Department', type: 'text' },
  { key: 'cid', header: 'CID', type: 'text' },
  { key: 'managerId', header: 'Manager ID', type: 'text' },
  { key: 'superManagerId', header: 'Super Manager ID', type: 'text' },
  { key: 'noticePeriod', header: 'Notice Period', type: 'text' },
  { key: 'division', header: 'Division', type: 'text' },
  { key: 'grade', header: 'Grade', type: 'text' },
  { key: 'location', header: 'Location', type: 'text' },
  { key: 'employeeNumberSeries', header: 'Employee Number Series', type: 'text' },
  // Education (flat → import builds education[])
  { key: 'institute', header: 'Institute Name', type: 'text' },
  { key: 'degree', header: 'Degree / Qualification', type: 'text' },
  { key: 'percentage', header: 'Percentage / CGPA', type: 'text' },
  { key: 'educationFromDate', header: 'Education From Date', type: 'date' },
  { key: 'educationToDate', header: 'Education To Date', type: 'date' },
  // Experience (flat → import builds experience[])
  { key: 'organization', header: 'Organization', type: 'text' },
  { key: 'experienceDesignation', header: 'Position / Designation', type: 'text' },
  { key: 'experienceFromDate', header: 'Experience From Date', type: 'date' },
  { key: 'experienceToDate', header: 'Experience To Date', type: 'date' },
  // Bank
  { key: 'accountNumber', header: 'Account Number', type: 'text' },
  { key: 'confirmAccountNumber', header: 'Confirm Account Number', type: 'text' },
  { key: 'bankName', header: 'Bank Name', type: 'text' },
  { key: 'ifscCode', header: 'IFSC Code', type: 'text' },
  { key: 'accountType', header: 'Account Type', type: 'select' },
  { key: 'branchName', header: 'Branch Name', type: 'text' },
  { key: 'salaryPaymentMode', header: 'Salary Payment Mode', type: 'select' },
  { key: 'nameAsPerBankRecords', header: 'Name as per Bank Records', type: 'text' },
  { key: 'iban', header: 'IBAN', type: 'text' },
  { key: 'swiftCode', header: 'Swift Code', type: 'text' },
  { key: 'bankBranch', header: 'Bank Branch', type: 'text' },
  // PF
  { key: 'isEligibleForPF', header: 'Is Employee Eligible for PF', type: 'checkbox' },
  { key: 'pfNumber', header: 'PF Number', type: 'text' },
  { key: 'pfScheme', header: 'PF Scheme', type: 'text' },
  { key: 'pfJoiningDate', header: 'PF Joining Date', type: 'date' },
  { key: 'eligibleForExcessEPFContribution', header: 'Eligible for Excess EPF Contribution', type: 'checkbox' },
  { key: 'isEligibleForExcessEPSContribution', header: 'Is Employee Eligible for Excess EPS Contribution', type: 'checkbox' },
  { key: 'isExistingMemberOfPF', header: 'Is Existing Member of PF', type: 'checkbox' },
  { key: 'salary', header: 'Salary', type: 'number' },
  { key: 'universalAccountNumber', header: 'Universal Account Number', type: 'text' },
  // ESI
  { key: 'isEligibleForESI', header: 'Is Employee Eligible for ESI', type: 'checkbox' },
  { key: 'esiNumber', header: 'ESI Number', type: 'text' },
  { key: 'isCoveredUnderLWF', header: 'Is Covered Under LWF', type: 'checkbox' },
  // Account
  { key: 'password', header: 'Password', type: 'text' }
]

const row1RequiredOnly = {
  firstName: 'Aarav',
  officialEmail: 'aarav.kumar@company.com',
  phone: '9876543210',
  employeeId: 'EMP001',
  role: 'employee'
}

const row2AllFields = {
  firstName: 'Priya',
  middleName: 'R',
  lastName: 'Sharma',
  gender: 'Female',
  bloodGroup: 'B+',
  birthdayDate: '1992-04-10',
  dateOfBirth: '1992-05-15',
  maritalStatus: 'Married',
  marriageDate: '2018-03-20',
  isPhysicallyChallenged: 'No',
  physicallyChallengedDetails: '',
  isInternationalEmployee: 'No',
  countryOfOrigin: 'India',
  cityLocation: 'Mumbai',
  primaryCountryCode: '+91',
  phone: '9123456789',
  secondaryCountryCode: '+91',
  secondaryContact: '9876543211',
  emergencyCountryCode: '+91',
  emergencyContact: '9876501234',
  emergencyContactName: 'Raj Sharma',
  email: 'priya.personal@gmail.com',
  alternativeEmail: 'priya.alt@yahoo.com',
  mobileNumber: '9123456789',
  'presentAddress.line1': '101, Green Valley Apartments',
  'presentAddress.line2': 'Andheri West',
  'presentAddress.district': 'Mumbai',
  'presentAddress.state': 'Maharashtra',
  'presentAddress.pincode': '400058',
  'presentAddress.country': 'India',
  'permanentAddress.line1': '45, Main Road',
  'permanentAddress.line2': 'Chennai',
  'permanentAddress.district': 'Chennai',
  'permanentAddress.state': 'Tamil Nadu',
  'permanentAddress.pincode': '600001',
  'permanentAddress.country': 'India',
  familyMemberName: 'Raj Sharma',
  relation: 'Spouse',
  familyDob: '1990-08-20',
  employeeId: 'EMP002',
  officialEmail: 'priya.sharma@company.com',
  businessUnitHR: 'BU1',
  designation: 'Senior Manager',
  role: 'manager',
  employeeStatus: 'Active',
  joiningDate: '2023-01-10',
  probationPeriod: 90,
  costCenter: 'CC-ENG-01',
  department: 'Engineering',
  cid: 'CID2001',
  managerId: 'MGR001',
  superManagerId: 'SMGR001',
  noticePeriod: '60',
  division: 'Product',
  grade: 'G5',
  location: 'Mumbai',
  employeeNumberSeries: 'S2023',
  institute: 'Mumbai University',
  degree: 'PG',
  percentage: '85',
  educationFromDate: '2012-06-01',
  educationToDate: '2014-05-31',
  organization: 'Tech Solutions Pvt Ltd',
  experienceDesignation: 'Software Engineer',
  experienceFromDate: '2014-07-01',
  experienceToDate: '2022-12-31',
  accountNumber: '50100234567890',
  confirmAccountNumber: '50100234567890',
  bankName: 'HDFC Bank',
  ifscCode: 'HDFC0001234',
  accountType: 'Savings',
  branchName: 'Andheri Branch',
  salaryPaymentMode: 'NEFT',
  nameAsPerBankRecords: 'Priya R Sharma',
  iban: '',
  swiftCode: '',
  bankBranch: 'Andheri',
  isEligibleForPF: 'Yes',
  pfNumber: 'MH/12345/67890',
  pfScheme: 'EPS',
  pfJoiningDate: '2023-02-01',
  eligibleForExcessEPFContribution: 'No',
  isEligibleForExcessEPSContribution: 'No',
  isExistingMemberOfPF: 'No',
  salary: 120000,
  universalAccountNumber: '101234567890',
  isEligibleForESI: 'No',
  esiNumber: '',
  isCoveredUnderLWF: 'No',
  password: 'TempEMP002123!'
}

function getCellValue (key, rowData) {
  const raw = rowData[key]
  if (raw === undefined || raw === '') return ''
  const col = COLUMNS.find(c => c.key === key)
  const type = col?.type || 'text'
  if (type === 'number' && typeof raw === 'number') return raw
  if (type === 'number' && raw !== '') return Number(raw)
  return String(raw)
}

async function generate () {
  const headers = COLUMNS.map(c => (REQUIRED_KEYS.has(c.key) ? `${c.header} *` : c.header))

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Employees', { views: [{ state: 'frozen', ySplit: 1 }] })

  const headerRow = ws.addRow(headers)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  headerRow.alignment = { horizontal: 'center' }
  headerRow.height = 22

  const values1 = COLUMNS.map(c => getCellValue(c.key, row1RequiredOnly))
  ws.addRow(values1)

  const values2 = COLUMNS.map(c => getCellValue(c.key, row2AllFields))
  ws.addRow(values2)

  COLUMNS.forEach((_, i) => {
    ws.getColumn(i + 1).width = Math.min(40, Math.max(12, (headers[i]?.length || 0) + 2))
  })

  const publicDir = join(__dirname, '..', 'public')
  const outPath = join(publicDir, 'Employee_Import_Template.xlsx')
  const buffer = await wb.xlsx.writeBuffer()
  writeFileSync(outPath, buffer)
  console.log('Written:', outPath)
  console.log('Row 1: required fields only. Row 2: all fields filled. Use Import in app to test.')
}

generate().catch(err => {
  console.error(err)
  process.exit(1)
})
