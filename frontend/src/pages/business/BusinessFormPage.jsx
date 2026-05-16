import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { createBusiness, updateBusiness, getBusiness } from '../../api/business'
import { getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

const TYPES = ['office', 'retail', 'warehouse', 'restaurant', 'other']

export default function BusinessFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = !!id

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: existing } = useQuery({
    queryKey: ['business', id],
    queryFn: () => getBusiness(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      reset({ name: existing.name, type: existing.type })
    }
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateBusiness(id, data) : createBusiness(data),
    onSuccess: (data) => {
      toast.success(isEdit ? 'Business updated' : 'Business created')
      qc.invalidateQueries({ queryKey: ['businesses'] })
      navigate(`/business/${data.id}`)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save business')),
  })

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Business' : 'New Business'}
        backTo={isEdit ? `/business/${id}` : '/business'}
      />

      <div className="max-w-lg mx-auto">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="card p-6 space-y-5">

          <div>
            <label className="label">Business Name</label>
            <input
              className={`input ${errors.name ? 'border-red-400' : ''}`}
              placeholder="e.g. Acme Ltd"
              {...register('name', { required: 'Business name is required' })}
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Type</label>
            <select
              className={`input ${errors.type ? 'border-red-400' : ''}`}
              {...register('type', { required: 'Please select a type' })}
            >
              <option value="">Select type…</option>
              {TYPES.map(t => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
            {errors.type && <p className="form-error">{errors.type.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isEdit ? 'Save Changes' : 'Create Business'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(isEdit ? `/business/${id}` : '/business')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}