import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Layout
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Auth
import LoginPage from './pages/auth/LoginPage'
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage'

// Landing
import LandingPage from './pages/landing/LandingPage'

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage'

// Profile
import ProfilePage from './pages/profile/ProfilePage'

// Admin
import UserListPage from './pages/admin/UserListPage'
import UserDetailPage from './pages/admin/UserDetailPage'
import CreateUserPage from './pages/admin/CreateUserPage'
import PromoteUserPage from './pages/admin/PromoteUserPage'

// Business
import BusinessListPage from './pages/business/BusinessListPage'
import BusinessFormPage from './pages/business/BusinessFormPage'
import BusinessDetailPage from './pages/business/BusinessDetailPage'

import PositionListPage from './pages/positions/PositionListPage'
import PositionFormPage from './pages/positions/PositionFormPage'

// Schedule
import SchedulePage from './pages/schedule/SchedulePage'
import ShiftFormPage from './pages/schedule/ShiftFormPage'

// Tax config
import TaxConfigPage from './pages/payroll/TaxConfigPage'
import PayConfigPage from './pages/payroll/PayConfigPage'

// Payroll
import GeneratePayslipPage from './pages/payroll/GeneratePayslipPage'
import PayslipListPage from './pages/payroll/PayslipListPage'
import PayslipDetailPage from './pages/payroll/PayslipDetailPage'

// Holidays
import SubmitHolidayPage from './pages/holidays/SubmitHolidayPage'
import MyHolidaysPage from './pages/holidays/MyHolidaysPage'
import ReviewHolidaysPage from './pages/holidays/ReviewHolidaysPage'

// Audit logs
import AuditLogPage from './pages/logs/AuditLogPage'

function ForcePasswordGuard() {
  const { user, accessToken } = useAuthStore()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  return <ForceChangePasswordPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ForcePasswordGuard />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<ProtectedRoute requiredPermissions={['can_add_user', 'can_delete_user']} />}>
              <Route path="/admin/users" element={<UserListPage />} />
              <Route path="/admin/users/:id" element={<UserDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="can_add_user" />}>
              <Route path="/admin/users/new" element={<CreateUserPage />} />
              <Route path="/admin/users/:id/promote" element={<PromoteUserPage />} />
            </Route>

            {/* Admin-only: create/edit business, tax config, pay config */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/business/new" element={<BusinessFormPage />} />
              <Route path="/business/:id/edit" element={<BusinessFormPage />} />
              <Route path="/payroll/tax-config" element={<TaxConfigPage />} />
              <Route path="/payroll/pay-config" element={<PayConfigPage />} />
            </Route>

            {/* Admin or can_manage_sections: business list + detail */}
            <Route element={<ProtectedRoute requiredPermission="can_manage_sections" />}>
              <Route path="/business" element={<BusinessListPage />} />
              <Route path="/business/:id" element={<BusinessDetailPage />} />
            </Route>

            {/* Admin or can_manage_positions: positions */}
            <Route element={<ProtectedRoute requiredPermission="can_manage_positions" />}>
              <Route path="/positions" element={<PositionListPage />} />
              <Route path="/positions/new" element={<PositionFormPage />} />
              <Route path="/positions/:id/edit" element={<PositionFormPage />} />
            </Route>

            <Route path="/schedule" element={<SchedulePage />} />

            <Route element={<ProtectedRoute requiredPermission="can_manage_schedule" />}>
              <Route path="/schedule/shifts/new" element={<ShiftFormPage />} />
              <Route path="/schedule/shifts/:id/edit" element={<ShiftFormPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="can_manage_payroll" />}>
              <Route path="/payroll/generate" element={<GeneratePayslipPage />} />
            </Route>

            <Route path="/payroll/payslips" element={<PayslipListPage />} />
            <Route path="/payroll/payslips/:id" element={<PayslipDetailPage />} />

            <Route path="/holidays/submit" element={<SubmitHolidayPage />} />
            <Route path="/holidays/mine" element={<MyHolidaysPage />} />

            <Route element={<ProtectedRoute requiredPermission="can_accept_requests" />}>
              <Route path="/holidays/review" element={<ReviewHolidaysPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="can_see_logs" />}>
              <Route path="/logs" element={<AuditLogPage />} />
            </Route>

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}