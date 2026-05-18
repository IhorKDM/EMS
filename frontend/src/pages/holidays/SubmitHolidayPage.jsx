import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Umbrella } from 'lucide-react'
import { createHoliday } from '../../api/holidays'
import { getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

function workingDays(start, end) {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return null
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export default function SubmitHolidayPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, control, formState: { errors } } = useForm()

  const startDate = useWatch({ control, name: 'start_date' })
  const endDate = useWatch({ control, name: 'end_date' })
  const days = workingDays(startDate, endDate)

  const mutation = useMutation({
    mutationFn: (data) => createHoliday({
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myHolidays'] })
      toast.success('Holiday request submitted')
      navigate('/holidays/mine')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to submit request')),
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Request Time Off" />

      <div className="card p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
            <Umbrella className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">New Holiday Request</h3>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                {...register('start_date', { required: 'Required' })}
              />
              {errors.start_date && <p className="form-error">{errors.start_date.message}</p>}
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                {...register('end_date', { required: 'Required' })}
              />
              {errors.end_date && <p className="form-error">{errors.end_date.message}</p>}
            </div>
          </div>

          {days !== null && (
            <div className="bg-primary-50 text-primary-700 rounded-lg px-4 py-2 text-sm font-medium">
              Duration: {days} working day{days !== 1 ? 's' : ''}
            </div>
          )}

          <div>
            <label className="label">Reason (optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Family holiday"
              {...register('reason')}
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700">
            Subject to manager approval. You will be notified once reviewed.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="btn-primary"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Submit Request'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/holidays/mine')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}