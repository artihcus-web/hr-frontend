import { FiHome, FiUser, FiClock, FiCalendar, FiUsers, FiCheckCircle, FiDollarSign, FiFileText, FiPlus, FiPieChart, FiSettings, FiBriefcase, FiTrendingUp, FiFolder, FiAlertCircle, FiMonitor } from 'react-icons/fi'






// Menu configuration based on HR_PORTAL_ARCHITECTURE.md
// Maps backend roles to frontend roles for menu filtering
export const roleMapping = {
  'admin': 'super_admin',
  'c-suite': 'c_suite',
  'hr': 'hr_admin',
  'supermanager': 'super_manager',
  'manager': 'manager',
  'tl': 'team_lead',
  'employee': 'employee',
  'client': 'client'
}

export const menuItems = [
  // Common Items (All Roles except super_admin)
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: FiHome,
    path: '/dashboard',
    roles: ['employee', 'manager', 'hr_admin', 'c_suite', 'team_lead', 'super_manager']
  },

  {
    id: 'projects',
    label: 'Projects',
    icon: FiFolder,
    path: '/projects',
    roles: ['employee', 'manager', 'hr_admin', 'team_lead']
  },
  {
    id: 'timesheet',
    label: 'Timesheet',
    icon: FiFileText,
    path: '/timesheet',
    roles: ['employee', 'manager', 'hr_admin', 'team_lead']
  },
  {
    id: 'grievance',
    label: 'Grievance',
    icon: FiBriefcase,
    path: '/grievance',
    roles: ['employee', 'Employee', 'manager', 'hr_admin', 'hr', 'team_lead', 'tl']
  },
  {
    id: 'holiday-calendar',
    label: 'Holiday Calendar',
    icon: FiCalendar,
    path: '/holiday-calendar',
    roles: ['employee', 'manager', 'hr_admin', 'team_lead', 'c_suite', 'super_manager']
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: FiCheckCircle,
    path: '/approvals/timesheet',
    roles: ['manager', 'hr_admin', 'super_manager']
  },




  {
    id: 'project-view',
    label: 'Project View',
    icon: FiBriefcase,
    path: '/project-view',
    roles: ['c_suite']
  },

  // Manager+ Items (except super_admin)


  // HR Admin+ Items (except super_admin)
  {
    id: 'payroll',
    label: 'Payroll',
    icon: FiDollarSign,
    path: '/payroll',
    roles: ['hr_admin'],
    children: [
      {
        id: 'payslips',
        label: 'Payslips',
        icon: FiFileText,
        path: '/payroll/payslips',
        roles: ['hr_admin']
      },
      {
        id: 'tax-documents',
        label: 'Tax Documents',
        icon: FiFileText,
        path: '/payroll/tax',
        roles: ['hr_admin']
      }
    ]
  },

  {
    id: 'employee-management',
    label: 'Employee Management',
    icon: FiUsers,
    path: '/employees',
    roles: ['hr_admin'],
    children: [
      {
        id: 'employee-directory',
        label: 'Employee Directory',
        icon: FiUsers,
        path: '/employees/directory',
        roles: ['hr_admin']
      },
      {
        id: 'add-employee',
        label: 'Add Employee',
        icon: FiPlus,
        path: '/employees/add',
        roles: ['hr_admin']
      },
      {
        id: 'employee-records',
        label: 'Employee Records',
        icon: FiFileText,
        path: '/employees/records',
        roles: ['hr_admin']
      }
    ]
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: FiBriefcase,
    path: '/recruitment',
    roles: ['hr_admin'],
    children: [
      {
        id: 'job-postings',
        label: 'Job Postings',
        icon: FiFileText,
        path: '/recruitment/jobs',
        roles: ['hr_admin']
      },
      {
        id: 'candidates',
        label: 'Candidates',
        icon: FiUser,
        path: '/recruitment/candidates',
        roles: ['hr_admin']
      },
      {
        id: 'interviews',
        label: 'Interviews',
        icon: FiCalendar,
        path: '/recruitment/interviews',
        roles: ['hr_admin']
      }
    ]
  },

  // Super Admin Only - Direct menu items (no dropdown)
  {
    id: 'admin-dashboard',
    label: 'Admin Dashboard',
    icon: FiHome,
    path: '/admin',
    exact: true,
    roles: ['super_admin']
  },
  {
    id: 'user-management',
    label: 'Employee Directory',
    icon: FiUsers,
    path: '/admin/users',
    roles: ['super_admin']
  },
  {
    id: 'project-management',
    label: 'Project Management',
    icon: FiBriefcase,
    path: '/admin/projects',
    roles: ['super_admin']
  },
  {
    id: 'grievance',
    label: 'Grievance Portal',
    icon: FiAlertCircle,
    path: '/grievance', // Admin access to global grievance view
    roles: ['super_admin']
  },
  {
    id: 'grievance-config',
    label: 'Ticket Configuration',
    icon: FiMonitor,
    path: '/admin/grievance-config',
    roles: ['super_admin']
  },



]
