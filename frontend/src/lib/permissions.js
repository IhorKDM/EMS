export function canDo(user, permission) {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.position?.permissions?.[permission] === true
}

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function isManager(user) {
  return user?.role === 'manager'
}

export function isEmployee(user) {
  return user?.role === 'employee'
}

export const PERMISSION_LABELS = {
  can_add_user:         'Can Add User',
  can_promote_user:     'Can Promote User',
  can_delete_user:      'Can Delete User',
  can_manage_positions: 'Can Manage Positions',
  can_manage_sections:  'Can Manage Sections',
  can_accept_requests:  'Can Accept Holiday Requests',
  can_manage_schedule:  'Can Manage Schedule',
  can_view_payroll:     'Can View Payroll',
  can_manage_payroll:   'Can Manage Payroll',
  can_see_logs:         'Can See Audit Logs',
}

export const PERMISSION_GROUPS = [
  {
    label: 'User Management',
    keys: ['can_add_user', 'can_promote_user', 'can_delete_user'],
  },
  {
    label: 'Organisation',
    keys: ['can_manage_positions', 'can_manage_sections'],
  },
  {
    label: 'Operations',
    keys: ['can_accept_requests', 'can_manage_schedule'],
  },
  {
    label: 'Finance',
    keys: ['can_view_payroll', 'can_manage_payroll'],
  },
  {
    label: 'Administration',
    keys: ['can_see_logs'],
  },
]