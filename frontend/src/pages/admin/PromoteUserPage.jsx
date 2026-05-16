import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowUpCircle } from 'lucide-react'
import { getUser, promoteUser } from '../../api/admin'
import { listPositions } from '../../api/positions'
import { getApiError } from '../../lib/utils'
import { PERMISSION_LABELS } from '../../lib/permissions'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function PromoteUserPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [newRole, setNewRole] = useState('manager')
  const [newPositionId, setNewPositionId] = useState('')

  const { data: u, isLoading: loadingUser } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
  })

  const { data: positions } = useQuery({
    queryKey: ['positions', u?.business_id],
    queryFn: () => listPositions(u?.business_id),
    enabled: !!u?.business_id,
  })

  const mutation = useMutation({
    mutationFn: () => promoteUser(id, {
      role: newRole,
      position_id: newPositionId ? Number(newPositionId) : undefined,
    }),
    onSuccess: () => {
      toast.success('User promoted successfully')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', id] })
      navigate(`/admin/users/${id}`)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to promote user')),
  })

  const selectedPosition = positions?.find(p => String(p.id) === String(newPositionId))
  const permissions = selectedPosition?.permissions ?? {}
  const activePerms = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k)

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Promote User"
        backTo={`/admin/users/${id}`}
      />

      <div className="max-w-xl space-y-5">

        {/* Current info */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Current</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
              {u?.first_name?.[0]}{u?.last_name?.[0]}
            </div>
            <div>
              <p className="font-medium text-slate-800">{u?.title} {u?.first_name} {u?.last_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={u?.role} />
                {u?.position && <span className="text-xs text-slate-400">{u.position.title}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* New role */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">New Role</p>
          <div className="flex gap-3">
            {['employee', 'manager', 'admin'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setNewRole(r)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                  newRole === r
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* New position */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">New Position</p>
          <select
            className="input"
            value={newPositionId}
            onChange={e => setNewPositionId(e.target.value)}
          >
            <option value="">Keep current position</option>
            {positions?.map(p => (
              <option key={p.id} value={p.id}>{p.title} (Rank {p.rank})</option>
            ))}
          </select>
        </div>

        {/* Permission preview */}
        {selectedPosition && (
          <div className="card p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Permission Preview — {selectedPosition.title}
            </p>
            {activePerms.length ? (
              <div className="space-y-1.5">
                {activePerms.map(k => (
                  <p key={k} className="text-xs text-green-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {PERMISSION_LABELS[k]}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No special permissions for this position</p>
            )}
          </div>
        )}

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700">
            ⚠ This will change the user's role and access level immediately.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => mutation.mutate()}
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><ArrowUpCircle className="w-4 h-4" /> Confirm Promote</>}
          </button>
          <button
            onClick={() => navigate(`/admin/users/${id}`)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}