import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowUpCircle, Trash2, Mail, Calendar, Building2, Briefcase } from 'lucide-react'
import { getUser, deleteUser } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { canDo } from '../../lib/permissions'
import { formatDate, getInitials } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import PermissionToggles from '../../components/shared/PermissionToggles'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import toast from 'react-hot-toast'
import { useState } from 'react'

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

  const { data: u, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!u) return null

  const isAdmin = me?.role === 'admin'
  const canDelete = canDo(me, 'can_delete_user') && me?.id !== u.id
  const canPromote = isAdmin && u.role !== 'admin'

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
              <InfoRow label="Date of Birth" value={formatDate(u.date_of_birth)} />
              <InfoRow label="First Login" value={u.is_first_login ? 'Yes — password not set' : 'No'} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Address</h3>
            <p className="text-sm text-slate-700">
              {[u.address_line1, u.address_line2, u.city, u.postcode, u.country].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        </div>

        {/* Work + Permissions */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Work Assignment</h3>
            <div className="space-y-4">
              <InfoRow label="Business" value={u.business?.name} />
              <InfoRow label="Position" value={u.position?.title} />
              <InfoRow label="Rank" value={u.position?.rank} />
            </div>
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