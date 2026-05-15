import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuthStore } from '../../store/authStore'
import { getMyProfile } from '../../api/users'

const PAGE_TITLES = {
  '/dashboard':          'Dashboard',
  '/profile':            'My Profile',
  '/admin/users':        'Users',
  '/admin/users/new':    'Create User',
  '/business':           'Businesses',
  '/business/new':       'New Business',
  '/positions':          'Positions',
  '/positions/new':      'New Position',
  '/schedule':           'Schedule',
  '/schedule/shifts/new':'New Shift',
  '/payroll/tax-config': 'Tax Configuration',
  '/payroll/generate':   'Generate Payslip',
  '/payroll/payslips':   'Payslips',
  '/holidays/submit':    'Request Holiday',
  '/holidays/mine':      'My Holidays',
  '/holidays/review':    'Holiday Review',
  '/logs':               'Audit Logs',
}

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.includes('/promote')) return 'Promote User'
  if (pathname.includes('/edit')) return 'Edit'
  if (pathname.match(/\/admin\/users\/\d+/)) return 'User Detail'
  if (pathname.match(/\/business\/\d+/)) return 'Business Detail'
  if (pathname.match(/\/positions\/\d+/)) return 'Edit Position'
  if (pathname.match(/\/schedule\/shifts\/\d+/)) return 'Edit Shift'
  if (pathname.match(/\/payroll\/payslips\/\d+/)) return 'Payslip Detail'
  return 'EMS'
}

export default function AppShell() {
  const { setUser } = useAuthStore()
  const { pathname } = useLocation()

  const { data: profile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (profile) setUser(profile)
  }, [profile, setUser])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title={getTitle(pathname)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}