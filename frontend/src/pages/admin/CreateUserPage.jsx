import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Loader2, Info } from 'lucide-react'
import { createEmployee, createManager } from '../../api/admin'
import { listBusinesses } from '../../api/business'
import { listPositions } from '../../api/positions'
import { getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useState } from 'react'

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof']

export default function CreateUserPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedBiz, setSelectedBiz] = useState('')
  const [role, setRole] = useState('employee')

  const { register, handleSubmit, formState: { errors } } = useForm()

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: listBusinesses,
  })

  const { data: positions } = useQuery({
    queryKey: ['positions', selectedBiz],
    queryFn: () => listPositions(selectedBiz),
    enabled: !!selectedBiz,
  })

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        business_id: data.business_id ? Number(data.business_id) : undefined,
        position_id: data.position_id ? Number(data.position_id) : undefined,
      }
      return role === 'manager' ? createManager(payload) : createEmployee(payload)
    },
    onSuccess: (data) => {
      toast.success(`${role === 'manager' ? 'Manager' : 'Employee'} created successfully`)
      qc.invalidateQueries({ queryKey: ['users'] })
      navigate(`/admin/users/${data.id}`)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to create user')),
  })

  return (
    <div>
      <PageHeader title="Create User" backTo="/admin/users" />

      <div className="max-w-2xl space-y-5">

        {/* Role selector */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Role</h3>
          <div className="flex gap-3">
            {['employee', 'manager'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors capitalize ${
                  role === r
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">

          {/* Personal */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Title</label>
                  <select className="input" {...register('title')}>
                    <option value="">—</option>
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">First Name</label>
                  <input className="input" {...register('first_name', { required: 'Required' })} />
                  {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input" {...register('last_name', { required: 'Required' })} />
                  {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  {...register('email', { required: 'Required' })}
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input max-w-xs" {...register('date_of_birth')} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Address</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Address Line 1</label>
                <input className="input" {...register('address_line1')} />
              </div>
              <div>
                <label className="label">Address Line 2</label>
                <input className="input" {...register('address_line2')} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">City</label>
                  <input className="input" {...register('city')} />
                </div>
                <div>
                  <label className="label">Postcode</label>
                  <input className="input" {...register('postcode')} />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input className="input" {...register('country')} />
                </div>
              </div>
            </div>
          </div>

          {/* Work Assignment */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Work Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Business</label>
                <select
                  className="input"
                  {...register('business_id')}
                  onChange={e => setSelectedBiz(e.target.value)}
                >
                  <option value="">Select business…</option>
                  {businesses?.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Position</label>
                <select className="input" {...register('position_id')} disabled={!selectedBiz}>
                  <option value="">Select position…</option>
                  {positions?.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (Rank {p.rank})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              A temporary password will be generated. The user will be prompted to set a new password on first login.
            </p>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : `Create ${role === 'manager' ? 'Manager' : 'Employee'}`}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/users')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}