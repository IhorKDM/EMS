import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canDo } from '../../lib/permissions'

export default function ProtectedRoute({ allowedRoles, requiredPermission, requiredPermissions }) {
  const { user, accessToken } = useAuthStore()

  if (!accessToken || !user) return <Navigate to="/login" replace />

  if (user.is_first_login) return <Navigate to="/change-password" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredPermission && !canDo(user, requiredPermission)) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredPermissions && !requiredPermissions.some(p => canDo(user, p))) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}