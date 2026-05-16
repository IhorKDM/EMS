import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, Calendar, Umbrella, UserPlus, ArrowRight } from 'lucide-react'
import { listUsers } from '../../api/admin'
import { listBusinesses } from '../../api/business'
import { listShifts } from '../../api/schedule'
import { listHolidays, reviewHoliday } from '../../api/holidays'
import { listLogs } from '../../api/logs'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime, formatDate } from '../../lib/utils'
import StatusBadge from '../../components/shared/StatusBadge'
import toast from 'react-hot-toast'

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    orange:  'bg-orange-50 text-orange-600',
    yellow:  'bg-yellow-50 text-yellow-600',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: usersData }     = useQuery({ queryKey: ['users'],     queryFn: listUsers })
  const { data: businesses }    = useQuery({ queryKey: ['businesses'], queryFn: listBusinesses })
  const { data: todayShifts }   = useQuery({ queryKey: ['shifts', today], queryFn: () => listShifts({ date: today }) })
  const { data: pendingHols }   = useQuery({ queryKey: ['holidays', 'pending'], queryFn: () => listHolidays({ status: 'pending' }) })
  const { data: logs }          = useQuery({ queryKey: ['logs', 5], queryFn: () => listLogs({ limit: 5 }) })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }) => reviewHoliday(id, { status }),
    onSuccess: () => {
      toast.success('Holiday request updated')
      qc.invalidateQueries({ queryKey: ['holidays'] })
    },
    onError: () => toast.error('Failed to update request'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Welcome back, {user?.first_name}
        </h2>
        <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Total Users"       value={usersData?.users?.length} color="primary" />
        <StatCard icon={Building2} label="Businesses"        value={businesses?.length}        color="green" />
        <StatCard icon={Calendar}  label="Shifts Today"      value={todayShifts?.length}       color="orange" />
        <StatCard icon={Umbrella}  label="Pending Holidays"  value={pendingHols?.length}       color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Recent Activity</h3>
            <button onClick={() => navigate('/logs')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {logs?.length ? logs.map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-700">{log.action}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                </div>
              </div>
            )) : <p className="text-xs text-slate-400">No recent activity</p>}
          </div>
        </div>

        {/* Pending Holidays */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Pending Holiday Requests</h3>
            <button onClick={() => navigate('/holidays/review')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {pendingHols?.length ? pendingHols.slice(0, 3).map(h => (
              <div key={h.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-700">
                    {h.employee?.first_name} {h.employee?.last_name}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(h.start_date)} – {formatDate(h.end_date)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => reviewMutation.mutate({ id: h.id, status: 'approved' })}
                    className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                  >Approve</button>
                  <button
                    onClick={() => reviewMutation.mutate({ id: h.id, status: 'rejected' })}
                    className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                  >Reject</button>
                </div>
              </div>
            )) : <p className="text-xs text-slate-400">No pending requests</p>}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/admin/users/new')} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
          <button onClick={() => navigate('/business/new')} className="btn-secondary">
            <Building2 className="w-4 h-4" /> New Business
          </button>
          <button onClick={() => navigate('/schedule/shifts/new')} className="btn-secondary">
            <Calendar className="w-4 h-4" /> Add Shift
          </button>
        </div>
      </div>
    </div>
  )
}