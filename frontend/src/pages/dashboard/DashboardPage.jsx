import { useAuthStore } from '../../store/authStore'
import AdminDashboard from './AdminDashboard'
import ManagerDashboard from './ManagerDashboard'
import EmployeeDashboard from './EmployeeDashboard'

export default function DashboardPage() {
  const { user } = useAuthStore()

  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'manager') return <ManagerDashboard />
  return <EmployeeDashboard />
}