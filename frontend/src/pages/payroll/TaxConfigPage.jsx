import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, DollarSign } from 'lucide-react'
import { getTaxConfig, saveTaxConfig } from '../../api/payroll'
import { listBusinesses } from '../../api/business'
import { getApiError, formatPercent } from '../../lib/utils'
import { useUiStore } from '../../store/uiStore'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

export default function TaxConfigPage() {
  const { selectedBusinessId, setSelectedBusinessId } = useUiStore()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: bizData } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => listBusinesses(),
  })
  const businesses = bizData?.businesses ?? bizData ?? []

  const { data: config, isLoading } = useQuery({
    queryKey: ['taxConfig', selectedBusinessId],
    queryFn: () => getTaxConfig(selectedBusinessId),
    enabled: Boolean(selectedBusinessId),
  })

  useEffect(() => {
    if (config) {
      reset({
        income_tax_rate: config.income_tax_rate,
        ni_rate: config.ni_rate,
      })
    } else {
      reset({ income_tax_rate: '', ni_rate: '' })
    }
  }, [config, reset])

  const mutation = useMutation({
    mutationFn: (data) => saveTaxConfig(selectedBusinessId, {
      income_tax_rate: parseFloat(data.income_tax_rate),
      ni_rate: parseFloat(data.ni_rate),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taxConfig', selectedBusinessId] })
      toast.success('Tax configuration saved')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save tax config')),
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Tax Configuration" />

      {/* Business selector */}
      <div className="card p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-slate-600 shrink-0">Business</label>
        <select
          className="input max-w-xs"
          value={selectedBusinessId ?? ''}
          onChange={e => setSelectedBusinessId(e.target.value || null)}
        >
          <option value="">Select business…</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {!selectedBusinessId ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          Select a business to view or edit its tax configuration.
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="card p-6 max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Tax Settings</h3>
          </div>

          {config && (
            <div className="mb-5 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
              <p>Current: Income Tax {formatPercent(config.income_tax_rate)} · NI {formatPercent(config.ni_rate)}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Income Tax Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="e.g. 0.20 for 20%"
                className="input"
                {...register('income_tax_rate', {
                  required: 'Required',
                  min: { value: 0, message: 'Min 0' },
                  max: { value: 1, message: 'Max 1' },
                })}
              />
              {errors.income_tax_rate && <p className="form-error">{errors.income_tax_rate.message}</p>}
            </div>

            <div>
              <label className="label">National Insurance Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="e.g. 0.12 for 12%"
                className="input"
                {...register('ni_rate', {
                  required: 'Required',
                  min: { value: 0, message: 'Min 0' },
                  max: { value: 1, message: 'Max 1' },
                })}
              />
              {errors.ni_rate && <p className="form-error">{errors.ni_rate.message}</p>}
            </div>

            <p className="text-xs text-slate-400">Enter decimal values — 0.20 = 20%, 0.12 = 12%</p>

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Save Tax Configuration'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}