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
            </Route>

            <Route element={<ProtectedRoute requiredPermissions={['can_add_user', 'can_delete_user']} />}>
              <Route path="/admin/users" element={<UserListPage />} />
              <Route path="/admin/users/:id" element={<UserDetailPage />} />
            </Route>

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}