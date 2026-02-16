import { FiHome, FiUser,FiUserCheck, FiClock, FiCalendar, FiUsers, FiCheckCircle, FiDollarSign, FiFileText, FiPlus, FiPieChart, FiSettings, FiBriefcase, FiTrendingUp, FiFolder, FiAlertCircle, FiMonitor,FiVideo } from 'react-icons/fi'






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
  // Super Admin Only - Ordered as requested
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
    roles: ['super_admin', 'hr_admin']
  },
  {
    id: 'project-management',
    label: 'Project Management',
    icon: FiBriefcase,
    path: '/admin/projects',
    roles: ['super_admin']
  },
  {
    id: 'form-builder',
    label: 'Schema Configuration',
    icon: FiSettings,
    path: '/admin/form-builder',
    roles: ['super_admin', 'hr_admin']
  },
  {
    id: 'admin-controllers',
    label: 'Admin Controllers',
    icon: FiSettings,
    path: '/admin/controllers',
    roles: ['super_admin']
  },
  {
    id: 'conference-hall-admin',
    label: 'Conference Hall',
    icon: FiVideo,
    path: '/conference-hall',
    roles: ['super_admin']
  },
  {
    id: 'admin-policies',
    label: 'Policies',
    icon: FiFileText,
    path: '/admin/policies',
    roles: ['super_admin', 'hr_admin']
  },
  {
    id: 'grievance-portal-admin',
    label: 'Grievance Portal',
    icon: FiAlertCircle,
    path: '/grievance',
    roles: ['super_admin']
  },

  // Employee and Others - Ordered as requested
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
    id: 'holiday-calendar',
    label: 'Holiday Calendar',
    icon: FiCalendar,
    path: '/holiday-calendar',
    roles: ['employee', 'manager', 'hr_admin', 'team_lead', 'c_suite', 'super_manager']
  },
  {
    id: 'know-your-employee',
    label: 'Know Your Employee',
    icon: FiUser,
    path: '/know-your-employee',
    roles: ['employee', 'manager', 'hr_admin', 'team_lead', 'c_suite', 'super_manager']
  },
  {
    id: 'conference-hall',
    label: 'Conference Hall',
    icon: FiVideo,
    path: '/conference-hall',
    roles: ['employee', 'manager', 'hr_admin', 'team_lead', 'c_suite', 'super_manager']
  },
  {
    id: 'policies',
    label: 'Policies',
    icon: FiFileText,
    path: '/policies',
    roles: ['employee', 'manager', 'hr_admin', 'team_lead', 'c_suite', 'super_manager']
  },
  {
    id: 'grievance',
    label: 'Grievance',
    icon: FiBriefcase,
    path: '/grievance',
    roles: ['employee', 'Employee', 'manager', 'hr_admin', 'hr', 'team_lead', 'tl']
  },

  // Additional items (not in main order)
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
  {
    id: 'grievance-config',
    label: 'Ticket Configuration',
    icon: FiMonitor,
    path: '/admin/grievance-config',
    roles: ['super_admin']
  }
]
