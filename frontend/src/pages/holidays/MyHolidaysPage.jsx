import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Umbrella, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { listHolidays } from '../../api/holidays'
import { formatDate, formatDateTime } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'

function workingDays(start, end) {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function HolidayCard({ holiday: h }) {
  const [expanded, setExpanded] = useState(false)
  const days = workingDays(h.start_date, h.end_date)
  const hasReviewDetail = h.reviewed_at || h.review_notes

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-medium text-slate-800">
              {formatDate(h.start_date)} – {formatDate(h.end_date)}
            </p>
            <span className="text-xs text-slate-400">
              {days} working day{days !== 1 ? 's' : ''}
            </span>
          </div>
          {h.reason && (
            <p className="text-sm text-slate-500 truncate">"{h.reason}"</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            Submitted {formatDate(h.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={h.status} />
          {hasReviewDetail && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
            >
              {expanded
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {expanded && hasReviewDetail && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-1 text-sm">
          {h.reviewed_at && (
            <p className="text-slate-500">
              Reviewed:{' '}
              <span className="text-slate-700">{formatDateTime(h.reviewed_at)}</span>
            </p>
          )}
          {h.review_notes && (
            <p className="text-slate-500">
              Notes:{' '}
              <span className="text-slate-700">{h.review_notes}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyHolidaysPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')

  const { data: holidays, isLoading } = useQuery({
    queryKey: ['myHolidays', filter],
    queryFn: () => listHolidays(filter ? { status: filter } : {}),
  })

  return (
    <div>
      <PageHeader
        title="My Holiday Requests"
        actions={
          <button onClick={() => navigate('/holidays/submit')} className="btn-primary">
            <Plus className="w-4 h-4" /> New Request
          </button>
        }
      />

      <div className="mb-5">
        <select
          className="input w-44"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-50 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : holidays?.length ? (
        <div className="space-y-3">
          {holidays.map(h => <HolidayCard key={h.id} holiday={h} />)}
        </div>
      ) : (
        <EmptyState
          icon={Umbrella}
          title="No holiday requests"
          description={filter ? 'No requests match this filter' : 'Submit your first holiday request'}
          action={!filter && (
            <button onClick={() => navigate('/holidays/submit')} className="btn-primary">
              <Plus className="w-4 h-4" /> New Request
            </button>
          )}
        />
      )}
    </div>
  )
}
