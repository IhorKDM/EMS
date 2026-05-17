import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { createShift, updateShift, getShift } from '../../api/schedule'
import { listUsers } from '../../api/admin'
import { getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

export default function ShiftFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: shift, isLoading: loadingShift } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => getShift(id),
    enabled: isEdit,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', { limit: 200 }],
    queryFn: () => listUsers({ limit: 200 }),
  })

  const employees = usersData?.users ?? []

  useEffect(() => {
    if (shift) {
      reset({
        employee_id: shift.employee_id,
        work_date: shift.work_date,
        start_time: shift.start_time?.slice(0, 5),
        end_time: shift.end_time?.slice(0, 5),
        notes: shift.notes ?? '',
      })
    }
  }, [shift, reset])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateShift(id, data) : createShift(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(isEdit ? 'Shift updated' : 'Shift created')
      navigate('/schedule')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save shift')),
  })

  if (isEdit && loadingShift) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'Edit Shift' : 'Add Shift'}
        back={{ label: 'Schedule', to: '/schedule' }}
      />

      <div className="card p-6 max-w-lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Employee</label>
            <select
              className="input"
              {...register('employee_id', { required: 'Required' })}
            >
              <option value="">Select employee…</option>
              {employees.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
            {errors.employee_id && <p className="form-error">{errors.employee_id.message}</p>}
          </div>

          <div>
            <label className="label">Work Date</label>
            <input
              type="date"
              className="input"
              {...register('work_date', { required: 'Required' })}
            />
            {errors.work_date && <p className="form-error">{errors.work_date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                className="input"
                {...register('start_time', { required: 'Required' })}
              />
              {errors.start_time && <p className="form-error">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                className="input"
                {...register('end_time', { required: 'Required' })}
              />
              {errors.end_time && <p className="form-error">{errors.end_time.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={3}
              {...register('notes')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isEdit ? 'Update Shift' : 'Create Shift'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/schedule')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}