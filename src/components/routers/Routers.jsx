import React from 'react'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import AdminDashboard from '../pages/admin/AdminDashboard'
import UserManagement from '../pages/admin/UserManagement'
import ProjectManagement from '../pages/admin/ProjectManagement'
import UserProjects from '../pages/UserProjects'
import Timesheet from '../pages/Timesheet'
import TimesheetApprovals from '../pages/approvals/TimesheetApprovals'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import ProjectView from '../pages/c-suite/ProjectView'
import HolidayCalendar from '../pages/HolidayCalendar'
import Grievance from '../pages/common/Grievance'
import GrievanceConfig from '../pages/admin/GrievanceConfig'
import ProtectedRoute from './ProtectedRoute'
import { Routes, Route, Navigate } from 'react-router-dom'

function Routers() {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Navigate to='/login' replace />} />
        <Route path='/login' element={<Login />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />

        {/* Protected Routes - Accessible by all authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/projects' element={<UserProjects />} />
          <Route path='/timesheet' element={<Timesheet />} />
          <Route path='/timesheet' element={<Timesheet />} />
          <Route path='/holiday-calendar' element={<HolidayCalendar />} />
          <Route path='/grievance' element={<Grievance />} />
        </Route>

        {/* Manager/HR Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['manager', 'hr', 'supermanager', 'admin', 'super_admin']} />}>
          <Route path='/approvals/timesheet' element={<TimesheetApprovals />} />
        </Route>



        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
          <Route path='/admin' element={<AdminDashboard />} />
          <Route path='/admin/users' element={<UserManagement />} />
          <Route path='/admin/projects' element={<ProjectManagement />} />
          <Route path='/admin/employee-management/projects' element={<Navigate to='/admin/projects' replace />} />
          <Route path='/admin/employee-management' element={<Navigate to='/admin/projects' replace />} />
          <Route path='/admin/grievance-config' element={<GrievanceConfig />} />
        </Route>

        {/* C-Suite Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['c-suite', 'admin']} />}>
          <Route path='/project-view' element={<ProjectView />} />
        </Route>

        <Route path='*' element={<Navigate to='/login' replace />} />
      </Routes>
    </div>
  )
}

export default Routers
