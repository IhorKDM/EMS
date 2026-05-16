import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Umbrella } from 'lucide-react'
import { listShifts } from '../../api/schedule'
import { listHolidays, reviewHoliday } from '../../api/holidays'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../lib/utils'
import { PERMISSION_LABELS } from '../../lib/permissions'
import StatusBadge from '../../components/shared/StatusBadge'
import toast from 'react-hot-toast'

export default function ManagerDashboard() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: shifts }      = useQuery({ queryKey: ['shifts'],            queryFn: () => listShifts() })
  const { data: pendingHols } = useQuery({ queryKey: ['holidays','pending'], queryFn: () => listHolidays({ status: 'pending' }) })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }) => reviewHoliday(id, { status }),
    onSuccess: () => {
      toast.success('Holiday request updated')
      qc.invalidateQueries({ queryKey: ['holidays'] })
    },
    onError: () => toast.error('Failed to update request'),
  })

  const permissions = user?.position?.permissions ?? {}
  const activePerms = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Welcome back, {user?.first_name}</h2>
        <p className="text-sm text-slate-500">{user?.position?.title} · {user?.business?.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{shifts?.length ?? '—'}</p>
            <p className="text-xs text-slate-500">Upcoming Shifts</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
            <Umbrella className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{pendingHols?.length ?? '—'}</p>
            <p className="text-xs text-slate-500">Pending Requests</p>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">My Permissions</p>
          <div className="space-y-1">
            {activePerms.length ? activePerms.map(k => (
              <p key={k} className="text-xs text-green-700">✓ {PERMISSION_LABELS[k]}</p>
            )) : <p className="text-xs text-slate-400">No special permissions</p>}
          </div>
        </div>
      </div>

      {/* Pending Holiday Requests */}
      {pendingHols?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Pending Holiday Requests</h3>
          <div className="space-y-4">
            {pendingHols.map(h => (
              <div key={h.id} className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {h.employee?.first_name} {h.employee?.last_name}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(h.start_date)} – {formatDate(h.end_date)}</p>
                  {h.reason && <p className="text-xs text-slate-500 mt-0.5">"{h.reason}"</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => reviewMutation.mutate({ id: h.id, status: 'approved' })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                  >Approve</button>
                  <button
                    onClick={() => reviewMutation.mutate({ id: h.id, status: 'rejected' })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                  >Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}