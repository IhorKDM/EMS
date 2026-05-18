import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Check, X, ChevronDown, ChevronUp, Umbrella } from 'lucide-react'
import { listHolidays, reviewHoliday } from '../../api/holidays'
import { formatDate, formatDateTime, getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'
import toast from 'react-hot-toast'

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

function PendingCard({ holiday: h }) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const days = workingDays(h.start_date, h.end_date)

  const reviewMutation = useMutation({
    mutationFn: (status) => reviewHoliday(h.id, { status, review_notes: notes || undefined }),
    onSuccess: (_, status) => {
      toast.success(`Request ${status === 'approved' ? 'approved' : 'rejected'}`)
      qc.invalidateQueries({ queryKey: ['holidays'] })
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to review request')),
  })

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 mb-0.5">
            {h.employee_name ?? `Employee #${h.employee_id}`}
          </p>
          <p className="text-sm text-slate-600">
            {formatDate(h.start_date)} – {formatDate(h.end_date)}
            <span className="text-slate-400 ml-1.5">· {days} working day{days !== 1 ? 's' : ''}</span>
          </p>
          {h.reason && (
            <p className="text-sm text-slate-500 mt-1">"{h.reason}"</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Submitted {formatDateTime(h.created_at)}
          </p>
        </div>
        <StatusBadge status={h.status} />
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div>
          <label className="label">Review Notes (optional)</label>
          <input
            className="input text-sm"
            placeholder="Leave a note for the employee…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => reviewMutation.mutate('approved')}
            disabled={reviewMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {reviewMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Check className="w-3.5 h-3.5" />}
            Approve
          </button>
          <button
            onClick={() => reviewMutation.mutate('rejected')}
            disabled={reviewMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function ReviewedCard({ holiday: h }) {
  const days = workingDays(h.start_date, h.end_date)
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">
          {h.employee_name ?? `Employee #${h.employee_id}`}
        </p>
        <p className="text-xs text-slate-400">
          {formatDate(h.start_date)} – {formatDate(h.end_date)}
          {' · '}{days} day{days !== 1 ? 's' : ''}
          {h.review_notes && ` · "${h.review_notes}"`}
        </p>
      </div>
      <StatusBadge status={h.status} />
    </div>
  )
}

export default function ReviewHolidaysPage() {
  const [showReviewed, setShowReviewed] = useState(false)

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ['holidays', 'pending'],
    queryFn: () => listHolidays({ status: 'pending' }),
  })

  const { data: reviewed, isLoading: loadingReviewed } = useQuery({
    queryKey: ['holidays', 'all'],
    queryFn: () => listHolidays(),
    select: (data) => data.filter(h => h.status !== 'pending'),
    enabled: showReviewed,
  })

  const pendingCount = pending?.length ?? 0

  return (
    <div>
      <PageHeader title="Holiday Requests — Review" />

      {/* Pending section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-600">Pending Requests</h3>
          {pendingCount > 0 && (
            <span className="w-5 h-5 bg-yellow-400 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </div>

        {loadingPending ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-50 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : pending?.length ? (
          <div className="space-y-3">
            {pending.map(h => <PendingCard key={h.id} holiday={h} />)}
          </div>
        ) : (
          <EmptyState
            icon={Umbrella}
            title="No pending requests"
            description="All caught up — nothing to review right now"
          />
        )}
      </div>

      {/* Reviewed section (collapsible) */}
      <div>
        <button
          onClick={() => setShowReviewed(v => !v)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium mb-3 transition-colors"
        >
          {showReviewed
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
          {showReviewed ? 'Hide' : 'Show'} reviewed requests
        </button>

        {showReviewed && (
          loadingReviewed ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-3 animate-pulse">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : reviewed?.length ? (
            <div className="space-y-2">
              {reviewed.map(h => <ReviewedCard key={h.id} holiday={h} />)}
            </div>
          ) : (
            <p className="text-sm text-slate-400 px-1">No reviewed requests yet.</p>
          )
        )}
      </div>
    </div>
  )
}
