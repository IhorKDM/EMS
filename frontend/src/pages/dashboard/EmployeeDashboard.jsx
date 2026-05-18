import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Calendar, Umbrella, DollarSign, Plus } from 'lucide-react'
import { listShifts } from '../../api/schedule'
import { listHolidays } from '../../api/holidays'
import { listPayslips } from '../../api/payroll'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatCurrency } from '../../lib/utils'
import StatusBadge from '../../components/shared/StatusBadge'

export default function EmployeeDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: shifts }   = useQuery({ queryKey: ['shifts'],   queryFn: () => listShifts() })
  const { data: holidays } = useQuery({ queryKey: ['holidays'], queryFn: () => listHolidays() })
  const { data: payslips } = useQuery({ queryKey: ['payslips'], queryFn: () => listPayslips() })

  const upcoming = shifts?.filter(s => new Date(s.work_date) >= new Date()).slice(0, 1)[0]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Welcome back, {user?.first_name}</h2>
        <p className="text-sm text-slate-500">
          {user?.business?.name} · {user?.position?.title}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Shift */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-slate-800 text-sm">My Next Shift</h3>
          </div>
          {upcoming ? (
            <div>
              <p className="text-lg font-bold text-slate-900">{formatDate(upcoming.work_date)}</p>
              <p className="text-sm text-slate-500">{upcoming.start_time} – {upcoming.end_time}</p>
              {upcoming.notes && <p className="text-xs text-slate-400 mt-1">{upcoming.notes}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No upcoming shifts</p>
          )}
        </div>

        {/* My Holidays */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Umbrella className="w-4 h-4 text-primary-600" />
              <h3 className="font-semibold text-slate-800 text-sm">My Holidays</h3>
            </div>
            <button onClick={() => navigate('/holidays/submit')} className="p-1 rounded-lg hover:bg-slate-100">
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="space-y-2">
            {holidays?.slice(0, 3).map(h => (
              <div key={h.id} className="flex items-center justify-between">
                <p className="text-xs text-slate-600">{formatDate(h.start_date)} – {formatDate(h.end_date)}</p>
                <StatusBadge status={h.status} />
              </div>
            )) ?? <p className="text-sm text-slate-400">No holiday requests</p>}
          </div>
        </div>
      </div>

      {/* Recent Payslips */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Recent Payslips</h3>
        </div>
        <div className="space-y-2">
          {payslips?.slice(0, 3).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <p className="text-sm text-slate-700">{p.period_label}</p>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{formatCurrency(p.net)}</p>
                <p className="text-xs text-slate-400">Gross {formatCurrency(p.gross)}</p>
              </div>
            </div>
          )) ?? <p className="text-sm text-slate-400">No payslips yet</p>}
        </div>
      </div>
    </div>
  )
}