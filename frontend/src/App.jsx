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
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}