import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { listLogs } from '../../api/logs'
import { listBusinesses } from '../../api/business'
import { formatDateTime } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'

const ACTION_COLORS = {
  user_created:       'bg-blue-100 text-blue-700',
  user_deleted:       'bg-red-100 text-red-700',
  user_promoted:      'bg-purple-100 text-purple-700',
  holiday_submitted:  'bg-orange-100 text-orange-700',
  holiday_approved:   'bg-green-100 text-green-700',
  holiday_rejected:   'bg-red-100 text-red-700',
  payslip_generated:  'bg-violet-100 text-violet-700',
  shift_created:      'bg-cyan-100 text-cyan-700',
  shift_deleted:      'bg-orange-100 text-orange-700',
  tax_config_updated: 'bg-pink-100 text-pink-700',
}

const ACTION_LABELS = {
  user_created:       'User Created',
  user_deleted:       'User Deleted',
  user_promoted:      'User Promoted',
  holiday_submitted:  'Holiday Submitted',
  holiday_approved:   'Holiday Approved',
  holiday_rejected:   'Holiday Rejected',
  payslip_generated:  'Payslip Generated',
  shift_created:      'Shift Created',
  shift_deleted:      'Shift Deleted',
  tax_config_updated: 'Tax Config Updated',
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

export default function AuditLogPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [bizFilter, setBizFilter]       = useState(isAdmin ? '' : String(user?.business_id ?? ''))
  const [actionFilter, setActionFilter] = useState('')
  const [limit, setLimit]               = useState(50)

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: listBusinesses,
    enabled: isAdmin,
  })

  const params = { limit }
  if (bizFilter)    params.business_id = Number(bizFilter)
  if (actionFilter) params.action = actionFilter

  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs', params],
    queryFn: () => listLogs(params),
  })

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle={logs ? `${logs.length} entries` : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {isAdmin && (
          <select
            className="input w-48"
            value={bizFilter}
            onChange={e => setBizFilter(e.target.value)}
          >
            <option value="">All Businesses</option>
            {businesses?.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <select
          className="input w-52"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>

        <select
          className="input w-32"
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
        >
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
          <option value={200}>200 rows</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-3 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : logs?.length ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Time
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.actor_name ?? (log.actor_id ? `#${log.actor_id}` : '—')}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.target_name ?? (log.target_user_id ? `#${log.target_user_id}` : '—')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {log.details ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {logs.length === limit
              ? `Showing ${logs.length} entries (limit reached — increase to see more)`
              : `Showing all ${logs.length} entries`}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={ScrollText}
          title="No log entries"
          description="Audit activity will appear here as users interact with the system"
        />
      )}
    </div>
  )
}
