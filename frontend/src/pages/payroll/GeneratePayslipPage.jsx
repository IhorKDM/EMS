import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { generatePayslip, getPayConfig, getTaxConfig } from '../../api/payroll'
import { listUsers } from '../../api/admin'
import { getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

export default function GeneratePayslipPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedEmployee, setSelectedEmployee] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm()

  const { data: usersData } = useQuery({
    queryKey: ['users', { limit: 200 }],
    queryFn: () => listUsers({ limit: 200 }),
  })
  const employees = usersData?.users ?? []

  const { data: payConfig } = useQuery({
    queryKey: ['payConfig', selectedEmployee],
    queryFn: () => getPayConfig(selectedEmployee),
    enabled: Boolean(selectedEmployee),
  })

  const { data: taxConfig } = useQuery({
    queryKey: ['taxConfigForEmp', selectedEmployee, employees],
    queryFn: () => {
      const emp = employees.find(u => String(u.id) === String(selectedEmployee))
      return emp?.business_id ? getTaxConfig(emp.business_id) : null
    },
    enabled: Boolean(selectedEmployee) && employees.length > 0,
  })

  const mutation = useMutation({
    mutationFn: (data) => generatePayslip({
      employee_id: parseInt(selectedEmployee),
      period_label: data.period_label,
      notes: data.notes || undefined,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payslips'] })
      toast.success('Payslip generated')
      navigate(`/payroll/payslips/${data.id}`)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to generate payslip')),
  })

  const hasPayConfig = Boolean(payConfig)
  const hasTaxConfig = Boolean(taxConfig)
  const canGenerate = hasPayConfig && hasTaxConfig

  return (
    <div className="space-y-5">
      <PageHeader title="Generate Payslip" />

      <div className="card p-6 max-w-lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">

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
            <textarea className="input" rows={3} {...register('notes')} />
          </div>

          {selectedEmployee && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Prerequisites</p>
              <PrereqRow
                ok={hasPayConfig}
                label={hasPayConfig
                  ? `Pay config: ${payConfig.pay_type} · £${payConfig.rate}/hr`
                  : 'Pay config: not set'}
              />
              <PrereqRow
                ok={hasTaxConfig}
                label={hasTaxConfig
                  ? `Tax config: ${(taxConfig.income_tax_rate * 100).toFixed(0)}% IT · ${(taxConfig.ni_rate * 100).toFixed(0)}% NI`
                  : 'Tax config: not set for this business'}
              />
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