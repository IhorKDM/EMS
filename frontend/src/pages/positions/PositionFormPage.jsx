import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { createPosition, updatePosition, getPosition } from '../../api/positions'
import { listBusinesses } from '../../api/business'
import { getApiError } from '../../lib/utils'
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../../lib/permissions'
import PageHeader from '../../components/shared/PageHeader'
import PermissionToggles from '../../components/shared/PermissionToggles'
import toast from 'react-hot-toast'

const PAY_TYPES = ['hourly', 'daily', 'contract']

export default function PositionFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = !!id

  const [payType, setPayType] = useState('hourly')
  const [permissions, setPermissions] = useState({})

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: listBusinesses,
  })

  const { data: existing } = useQuery({
    queryKey: ['position', id],
    queryFn: () => getPosition(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      reset({
        title:                   existing.title,
        rank:                    existing.rank,
        business_id:             existing.business_id,
        default_rate:            existing.default_rate,
        default_contract_amount: existing.default_contract_amount,
      })
      setPayType(existing.default_pay_type ?? 'hourly')
      setPermissions(existing.permissions ?? {})
    }
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        rank:                    Number(data.rank),
        business_id:             Number(data.business_id),
        default_pay_type:        payType,
        default_rate:            data.default_rate ? Number(data.default_rate) : undefined,
        default_contract_amount: data.default_contract_amount ? Number(data.default_contract_amount) : undefined,
        permissions,
      }
      return isEdit ? updatePosition(id, payload) : createPosition(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Position updated' : 'Position created')
      qc.invalidateQueries({ queryKey: ['positions'] })
      navigate('/positions')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save position')),
  })

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Position' : 'New Position'}
        backTo="/positions"
      />

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">

          {/* Details */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Position Title</label>
                <input
                  className={`input ${errors.title ? 'border-red-400' : ''}`}
                  placeholder="e.g. Sales Associate"
                  {...register('title', { required: 'Required' })}
                />
                {errors.title && <p className="form-error">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rank</label>
                  <input
                    type="number"
                    min="1"
                    className={`input ${errors.rank ? 'border-red-400' : ''}`}
                    placeholder="1"
                    {...register('rank', { required: 'Required' })}
                  />
                  {errors.rank && <p className="form-error">{errors.rank.message}</p>}
                </div>

                <div>
                  <label className="label">Business</label>
                  <select
                    className={`input ${errors.business_id ? 'border-red-400' : ''}`}
                    {...register('business_id', { required: 'Required' })}
                  >
                    <option value="">Select business…</option>
                    {businesses?.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {errors.business_id && <p className="form-error">{errors.business_id.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Pay settings */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Default Pay Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Pay Type</label>
                <div className="flex gap-2">
                  {PAY_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPayType(t)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        payType === t
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {(payType === 'hourly' || payType === 'daily') && (
                <div>
                  <label className="label">
                    Rate (£/{payType === 'hourly' ? 'hr' : 'day'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    placeholder="0.00"
                    {...register('default_rate')}
                  />
                </div>
              )}

              {payType === 'contract' && (
                <div>
                  <label className="label">Contract Amount (£/month)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    placeholder="0.00"
                    {...register('default_contract_amount')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Manager Permissions</h3>
            <p className="text-xs text-slate-400 mb-5">
              These apply when a manager is assigned this position.
            </p>
            <PermissionToggles value={permissions} onChange={setPermissions} />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isEdit ? 'Save Changes' : 'Create Position'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/positions')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}