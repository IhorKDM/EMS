import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, DollarSign } from 'lucide-react'
import { listUsers } from '../../api/admin'
import { getPayConfig, createPayConfig, updatePayConfig } from '../../api/payroll'
import { getApiError } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import toast from 'react-hot-toast'

const PAY_TYPES = [
  { value: 'hourly',   label: 'Hourly',   hint: 'Rate per hour (£/hr)' },
  { value: 'daily',    label: 'Daily',    hint: 'Rate per day (£/day)' },
  { value: 'contract', label: 'Contract', hint: 'Fixed contract amount (£)' },
]

export default function PayConfigPage() {
  const qc = useQueryClient()
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [payType, setPayType]                   = useState('hourly')
  const [rate, setRate]                         = useState('')
  const [contractAmount, setContractAmount]     = useState('')

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })
  const employees = (usersData?.users ?? usersData ?? []).filter(u => u.role === 'employee')

  const selectedUser = employees.find(u => String(u.id) === selectedEmployee)

  const { data: existingConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['payConfig', selectedEmployee],
    queryFn: () => getPayConfig(selectedEmployee),
    enabled: !!selectedEmployee,
    retry: false,
    // 404 means no config yet — treat as null
    queryFn: async () => {
      try {
        return await getPayConfig(selectedEmployee)
      } catch (err) {
        if (err?.response?.status === 404) return null
        throw err
      }
    },
  })

  // Pre-fill form when config loads
  useEffect(() => {
    if (existingConfig) {
      setPayType(existingConfig.pay_type)
      setRate(existingConfig.rate != null ? String(existingConfig.rate) : '')
      setContractAmount(existingConfig.contract_amount != null ? String(existingConfig.contract_amount) : '')
    } else {
      setPayType('hourly')
      setRate('')
      setContractAmount('')
    }
  }, [existingConfig, selectedEmployee])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        employee_id:     Number(selectedEmployee),
        business_id:     selectedUser?.business_id,
        pay_type:        payType,
        rate:            payType !== 'contract' ? (rate ? Number(rate) : null) : null,
        contract_amount: payType === 'contract' ? (contractAmount ? Number(contractAmount) : null) : null,
      }
      return existingConfig
        ? updatePayConfig(selectedEmployee, payload)
        : createPayConfig(payload)
    },
    onSuccess: () => {
      toast.success(existingConfig ? 'Pay config updated' : 'Pay config created')
      qc.invalidateQueries({ queryKey: ['payConfig', selectedEmployee] })
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save pay config')),
  })

  const isContract = payType === 'contract'
  const canSave = selectedEmployee && selectedUser?.business_id &&
    (isContract ? !!contractAmount : !!rate)

  return (
    <div>
      <PageHeader title="Pay Configuration" />

      <div className="max-w-lg space-y-5">

        {/* Employee selector */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Select Employee</h3>
          <select
            className="input"
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
          >
            <option value="">Choose an employee…</option>
            {employees.map(u => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name}
                {u.position ? ` — ${u.position.title}` : ''}
              </option>
            ))}
          </select>

          {selectedUser && !selectedUser.business_id && (
            <p className="text-xs text-red-500 mt-2">
              This employee has no business assigned — assign one first before setting pay config.
            </p>
          )}
        </div>

        {/* Config form */}
        {selectedEmployee && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Pay Config
                {selectedUser && (
                  <span className="text-slate-400 font-normal ml-1.5">
                    — {selectedUser.first_name} {selectedUser.last_name}
                  </span>
                )}
              </h3>
              {loadingConfig && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              {!loadingConfig && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  existingConfig
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {existingConfig ? 'Configured' : 'Not set'}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Pay type */}
              <div>
                <label className="label">Pay Type</label>
                <div className="flex gap-2">
                  {PAY_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setPayType(t.value); setRate(''); setContractAmount('') }}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        payType === t.value
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate or contract amount */}
              {!isContract ? (
                <div>
                  <label className="label">
                    Rate (£/{payType === 'hourly' ? 'hr' : 'day'})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input pl-7"
                      placeholder="0.00"
                      value={rate}
                      onChange={e => setRate(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label">Contract Amount (£)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input pl-7"
                      placeholder="0.00"
                      value={contractAmount}
                      onChange={e => setContractAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              {((isContract && contractAmount) || (!isContract && rate)) && (
                <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    {isContract
                      ? `Fixed contract: £${Number(contractAmount).toLocaleString()}`
                      : payType === 'hourly'
                        ? `£${rate}/hr × 160 hrs/mo ≈ £${(Number(rate) * 160).toLocaleString()} gross/mo`
                        : `£${rate}/day × 22 days/mo ≈ £${(Number(rate) * 22).toLocaleString()} gross/mo`}
                  </span>
                </div>
              )}

              <button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
                className="btn-primary w-full justify-center"
              >
                {saveMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : existingConfig ? 'Update Pay Config' : 'Save Pay Config'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
