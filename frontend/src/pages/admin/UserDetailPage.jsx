import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowUpCircle, Trash2, Mail, Calendar, Building2, Briefcase, Pencil, Check, X } from 'lucide-react'
import { getUser, deleteUser, updateUser } from '../../api/admin'
import { listBusinesses, listSections } from '../../api/business'
import { listPositions } from '../../api/positions'
import { useAuthStore } from '../../store/authStore'
import { canDo } from '../../lib/permissions'
import { formatDate, getInitials, getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import PermissionToggles from '../../components/shared/PermissionToggles'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import toast from 'react-hot-toast'

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  )
}

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuthStore()
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(false)
  const [assignBiz, setAssignBiz]   = useState('')
  const [assignPos, setAssignPos]   = useState('')
  const [assignSec, setAssignSec]   = useState('')

  const { data: u, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
  })

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: listBusinesses,
    enabled: editingAssignment,
  })

  const { data: positions } = useQuery({
    queryKey: ['positions', assignBiz],
    queryFn: () => listPositions(assignBiz || undefined),
    enabled: editingAssignment && !!assignBiz,
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', assignBiz],
    queryFn: () => listSections(assignBiz),
    enabled: editingAssignment && !!assignBiz,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['users'] })
      navigate('/admin/users')
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const assignMutation = useMutation({
    mutationFn: () => {
      const payload = {}
      if (assignBiz) payload.business_id = Number(assignBiz)
      if (assignPos) payload.position_id = Number(assignPos)
      if (assignSec) payload.section_id  = Number(assignSec)
      return updateUser(id, payload)
    },
    onSuccess: () => {
      toast.success('Work assignment updated')
      qc.invalidateQueries({ queryKey: ['user', id] })
      setEditingAssignment(false)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update assignment')),
  })

  const startEdit = () => {
    setAssignBiz(String(u.business_id ?? ''))
    setAssignPos(String(u.position_id ?? ''))
    setAssignSec(String(u.section_id ?? ''))
    setEditingAssignment(true)
  }

  const cancelEdit = () => {
    setEditingAssignment(false)
    setAssignBiz('')
    setAssignPos('')
    setAssignSec('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!u) return null

  const isAdmin = me?.role === 'admin'
  const myRank  = isAdmin ? Infinity : (me?.position?.rank ?? null)
  const canDelete = canDo(me, 'can_delete_user') && me?.id !== u.id
                    && (myRank === null || !u.position || u.position.rank < myRank)
  const canPromote = canDo(me, 'can_add_user') && u.role !== 'admin'
                     && (myRank === null || !u.position || u.position.rank < myRank)

  return (
    <div>
      <PageHeader
        title={`${u.title ?? ''} ${u.first_name} ${u.last_name}`}
        backTo="/admin/users"
        actions={
          <div className="flex gap-2">
            {canPromote && (
              <button
                onClick={() => navigate(`/admin/users/${id}/promote`)}
                className="btn-secondary"
              >
                <ArrowUpCircle className="w-4 h-4" /> Promote
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-danger"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Avatar card */}
        <div className="card overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary-600 to-primary-400" />
          <div className="px-5 pb-5">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-xl font-bold text-primary-700 bg-primary-100 -mt-8 mb-3">
              {getInitials(u.first_name, u.last_name)}
            </div>
            <p className="font-semibold text-slate-900">{u.title} {u.first_name} {u.last_name}</p>
            <div className="flex items-center gap-1.5 mt-1 mb-3">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs text-slate-500">{u.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={u.role} />
              <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                Joined {formatDate(u.created_at)}
              </div>
              {u.business && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Building2 className="w-3.5 h-3.5" />
                  {u.business.name}
                </div>
              )}
              {u.position && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Briefcase className="w-3.5 h-3.5" />
                  {u.position.title}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Personal Information</h3>
            <div className="space-y-4">
              <InfoRow label="Title" value={u.title} />
              <InfoRow label="Date of Birth" value={formatDate(u.dob)} />
              <InfoRow label="First Login" value={u.is_first_login ? 'Yes — password not set' : 'No'} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Address</h3>
            <p className="text-sm text-slate-700">
              {[u.address?.line1, u.address?.line2, u.address?.city, u.address?.postcode, u.address?.country].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        </div>

        {/* Work + Permissions */}
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Work Assignment</h3>
              {isAdmin && !editingAssignment && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {editingAssignment ? (
              <div className="space-y-3">
                <div>
                  <label className="label">Business</label>
                  <select
                    className="input"
                    value={assignBiz}
                    onChange={e => { setAssignBiz(e.target.value); setAssignPos(''); setAssignSec('') }}
                  >
                    <option value="">Select business…</option>
                    {businesses?.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Position</label>
                  <select
                    className="input"
                    value={assignPos}
                    onChange={e => setAssignPos(e.target.value)}
                    disabled={!assignBiz}
                  >
                    <option value="">Select position…</option>
                    {positions
                      ?.filter(p => myRank === null || p.rank < myRank)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.title} (Rank {p.rank})</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">Section (optional)</label>
                  <select
                    className="input"
                    value={assignSec}
                    onChange={e => setAssignSec(e.target.value)}
                    disabled={!assignBiz}
                  >
                    <option value="">None</option>
                    {sections?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending || !assignBiz}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {assignMutation.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Check className="w-3.5 h-3.5" />}
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <InfoRow label="Business" value={u.business?.name} />
                <InfoRow label="Position" value={u.position?.title} />
                <InfoRow label="Rank" value={u.position?.rank} />
              </div>
            )}
          </div>

          {u.role === 'manager' && u.position?.permissions && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Permissions</h3>
              <PermissionToggles value={u.position.permissions} readOnly />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete User"
        description={`Are you sure you want to delete ${u.first_name} ${u.last_name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
