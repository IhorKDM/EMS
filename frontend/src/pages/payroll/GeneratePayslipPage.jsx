import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { generatePayslip, getPayConfig, getTaxConfig } from '../../api/payroll'
import { listUsers } from '../../api/admin'
import { getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

function formatPeriodLabel(start, end) {
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  // If same month+year, use "May 2026" style
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return s.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(s)} – ${fmt(e)}`
}

export default function GeneratePayslipPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedEmployee, setSelectedEmployee] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm()
  const periodStart = watch('period_start')
  const periodEnd   = watch('period_end')

  // Auto-fill period label when dates change
  useEffect(() => {
    const label = formatPeriodLabel(periodStart, periodEnd)
    if (label) setValue('period_label', label)
  }, [periodStart, periodEnd, setValue])

  const { data: usersData } = useQuery({
    queryKey: ['users', { limit: 200 }],
    queryFn: () => listUsers({ limit: 200 }),
  })
  const employees = usersData?.users ?? []

  // Explicit pay config (404 → null, no error)
  const { data: payConfig } = useQuery({
    queryKey: ['payConfig', selectedEmployee],
    queryFn: () => getPayConfig(selectedEmployee).catch(err =>
      err?.response?.status === 404 ? null : Promise.reject(err)
    ),
    enabled: Boolean(selectedEmployee),
  })

  const selectedEmp = employees.find(u => String(u.id) === String(selectedEmployee))

  const { data: taxConfig } = useQuery({
    queryKey: ['taxConfigForEmp', selectedEmployee],
    queryFn: () =>
      selectedEmp?.business_id
        ? getTaxConfig(selectedEmp.business_id).catch(err =>
            err?.response?.status === 404 ? null : Promise.reject(err)
          )
        : null,
    enabled: Boolean(selectedEmployee) && Boolean(selectedEmp?.business_id),
  })

  // Backend falls back to position defaults when no explicit PayConfig exists
  const positionDefaults = selectedEmp?.position?.default_pay_type && selectedEmp?.position?.default_rate != null
    ? selectedEmp.position
    : null
  const effectivePay = payConfig ?? positionDefaults

  const mutation = useMutation({
    mutationFn: (data) => generatePayslip({
      employee_id:  parseInt(selectedEmployee),
      period_label: data.period_label,
      period_start: data.period_start || undefined,
      period_end:   data.period_end || undefined,
      notes:        data.notes || undefined,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payslips'] })
      toast.success('Payslip generated')
      navigate(`/payroll/payslips/${data.id}`)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to generate payslip')),
  })

  const hasPayConfig = Boolean(effectivePay)
  const hasTaxConfig = Boolean(taxConfig)
  const canGenerate  = hasPayConfig && hasTaxConfig

  return (
    <div className="space-y-5">
      <PageHeader title="Generate Payslip" />

      <div className="card p-6 max-w-lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">

          {/* Employee */}
          <div>
            <label className="label">Employee</label>
            <select
              className="input"
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
            >
              <option value="">Select employee…</option>
              {employees.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Period dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Period Start</label>
              <input
                type="date"
                className="input"
                {...register('period_start', { required: 'Required' })}
              />
              {errors.period_start && <p className="form-error">{errors.period_start.message}</p>}
            </div>
            <div>
              <label className="label">Period End</label>
              <input
                type="date"
                className="input"
                {...register('period_end', { required: 'Required' })}
              />
              {errors.period_end && <p className="form-error">{errors.period_end.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Period Label</label>
            <input
              className="input"
              placeholder="e.g. May 2026"
              {...register('period_label', { required: 'Required' })}
            />
            {errors.period_label && <p className="form-error">{errors.period_label.message}</p>}
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} {...register('notes')} />
          </div>

          {/* Prerequisites */}
          {selectedEmployee && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Prerequisites</p>
              <PrereqRow
                ok={hasPayConfig}
                label={hasPayConfig
                  ? payConfig
                    ? `Pay config: ${payConfig.pay_type} · £${payConfig.rate}`
                    : `Position default: ${positionDefaults.default_pay_type} · £${positionDefaults.default_rate}`
                  : 'Pay config: not set (assign position with pay defaults)'}
              />
              <PrereqRow
                ok={hasTaxConfig}
                label={hasTaxConfig
                  ? `Tax config: ${(taxConfig.income_tax * 100).toFixed(0)}% IT · ${(taxConfig.ni_rate * 100).toFixed(0)}% NI`
                  : 'Tax config: not set for this business'}
              />
              {periodStart && periodEnd && (
                <p className="text-xs text-slate-400 pt-1">
                  Gross will be calculated from shifts between {periodStart} and {periodEnd}.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={mutation.isPending || !selectedEmployee || !canGenerate}
          >
            {mutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : 'Generate Payslip'}
          </button>

          {selectedEmployee && !canGenerate && (
            <p className="text-xs text-red-500 text-center">
              Set up pay config and tax config before generating.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

function PrereqRow({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok
        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
      <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
    </div>
  )
}
