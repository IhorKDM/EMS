import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Trash2, ArrowRight } from 'lucide-react'
import { listBusinesses, deleteBusiness } from '../../api/business'
import { formatDate } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import EmptyState from '../../components/shared/EmptyState'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function BusinessListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmId, setConfirmId] = useState(null)

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: listBusinesses,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteBusiness(confirmId),
    onSuccess: () => {
      toast.success('Business deleted')
      qc.invalidateQueries({ queryKey: ['businesses'] })
      setConfirmId(null)
    },
    onError: () => toast.error('Failed to delete business'),
  })

  const confirmBusiness = businesses?.find(b => b.id === confirmId)

  return (
    <div>
      <PageHeader
        title="Businesses"
        subtitle={`${businesses?.length ?? 0} total`}
        actions={
          <button onClick={() => navigate('/business/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> New Business
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : businesses?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map(b => (
            <div key={b.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/business/${b.id}`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmId(b.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{b.name}</h3>
              <div className="flex items-center justify-between mt-2">
                <StatusBadge status={b.type} />
                <span className="text-xs text-slate-400">{formatDate(b.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No businesses yet"
          description="Create your first business to get started"
          action={
            <button onClick={() => navigate('/business/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> New Business
            </button>
          }
        />
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Business"
        description={`Are you sure you want to delete "${confirmBusiness?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}