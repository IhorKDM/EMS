import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, User, Users, Building2, Briefcase,
  Calendar, DollarSign, Umbrella, ScrollText, LogOut, X, UserPlus
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { canDo } from '../../lib/permissions'
import toast from 'react-hot-toast'

function NavItem({ to, icon: Icon, label, end }) {
  const { setSidebarOpen } = useUiStore()
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

function Section({ label, children }) {
  return (
    <div className="pt-2">
      <p className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUiStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const isEmployee = user?.role === 'employee'

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-30 flex flex-col
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center px-4 py-4 border-b border-slate-100">
          <img src="/logo-light.png" alt="EMS" className="logo h-14 w-auto object-contain" />
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-3 lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          <Section label="General">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" end />
            <NavItem to="/profile" icon={User} label="My Profile" />
          </Section>

          {isAdmin && (
            <Section label="Admin">
              <NavItem to="/admin/users" icon={Users} label="Users" />
              <NavItem to="/business" icon={Building2} label="Businesses" />
              <NavItem to="/positions" icon={Briefcase} label="Positions" />
              <NavItem to="/payroll/tax-config" icon={DollarSign} label="Tax Config" />
            </Section>
          )}

          {isManager && (canDo(user, 'can_add_user') || canDo(user, 'can_delete_user')) && (
            <Section label="Staff">
              <NavItem to="/admin/users" icon={Users} label="Users" />
              {canDo(user, 'can_add_user') && (
                <NavItem to="/admin/users/new" icon={UserPlus} label="Add User" />
              )}
            </Section>
          )}

          {(isAdmin || isManager) && (
            <Section label="Management">
              {(isAdmin || canDo(user, 'can_manage_schedule')) && (
                <NavItem to="/schedule" icon={Calendar} label="Schedule" />
              )}
              {(isAdmin || canDo(user, 'can_view_payroll')) && (
                <NavItem to="/payroll/payslips" icon={DollarSign} label="Payslips" />
              )}
              {(isAdmin || canDo(user, 'can_manage_payroll')) && (
                <NavItem to="/payroll/generate" icon={DollarSign} label="Generate Payslip" />
              )}
              {(isAdmin || canDo(user, 'can_accept_requests')) && (
                <NavItem to="/holidays/review" icon={Umbrella} label="Holiday Review" />
              )}
              {(isAdmin || canDo(user, 'can_see_logs')) && (
                <NavItem to="/logs" icon={ScrollText} label="Audit Logs" />
              )}
            </Section>
          )}

          <Section label="My">
            {isEmployee && (
              <NavItem to="/schedule" icon={Calendar} label="My Schedule" />
            )}
            {isEmployee && (
              <NavItem to="/payroll/payslips" icon={DollarSign} label="My Payslips" />
            )}
            <NavItem to="/holidays/mine" icon={Umbrella} label="My Holidays" />
          </Section>
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}