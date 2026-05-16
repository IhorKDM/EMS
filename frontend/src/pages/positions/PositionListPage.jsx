import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { listPositions, deletePosition } from '../../api/positions'
import { listBusinesses } from '../../api/business'
import { PERMISSION_LABELS } from '../../lib/permissions'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import EmptyState from '../../components/shared/EmptyState'
import toast from 'react-hot-toast'

export default function PositionListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedBiz, setSelectedBiz] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: listBusinesses,
  })

  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions', selectedBiz],
    queryFn: () => listPositions(selectedBiz),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePosition(confirmId),
    onSuccess: () => {
      toast.success('Position deleted')
      qc.invalidateQueries({ queryKey: ['positions'] })
      setConfirmId(null)
    },
    onError: () => toast.error('Failed to delete position'),
  })

  const confirmPosition = positions?.find(p => p.id === confirmId)
  const activePerms = (p) => Object.entries(p.permissions ?? {}).filter(([, v]) => v).map(([k]) => k)

  return (
    <div>
      <PageHeader
        title="Positions"
        subtitle={`${positions?.length ?? 0} total`}
        actions={
          <button onClick={() => navigate('/positions/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> New Position
          </button>
        }
      />

      {/* Business filter */}
      <div className="mb-5">
        <select
          className="input w-56"
          value={selectedBiz}
          onChange={e => setSelectedBiz(e.target.value)}
        >
          <option value="">All Businesses</option>
          {businesses?.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : positions?.length ? (
        <div className="space-y-3">
          {positions.map(p => (
            <div key={p.id} className="card overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">Rank {p.rank}</span>
                    <span className="text-slate-200">·</span>
                    <StatusBadge status={p.default_pay_type} />
                    {p.default_rate && (
                      <span className="text-xs text-slate-400">£{p.default_rate}/{p.default_pay_type === 'hourly' ? 'hr' : 'day'}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => navigate(`/positions/${p.id}/edit`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmId(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                  >
                    {expanded === p.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded permissions */}
              {expanded === p.id && (
                <div className="border-t border-slate-100 px-4 py-4 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Permissions
                  </p>
                  {activePerms(p).length ? (
                    <div className="flex flex-wrap gap-2">
                      {activePerms(p).map(k => (
                        <span key={k} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          {PERMISSION_LABELS[k]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No special permissions</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No positions found"
          description="Create your first position to assign to employees"
          action={
            <button onClick={() => navigate('/positions/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> New Position
            </button>
          }
        />
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Position"
        description={`Delete "${confirmPosition?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}