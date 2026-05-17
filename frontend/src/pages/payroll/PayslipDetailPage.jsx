import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ArrowLeft } from 'lucide-react'
import { getPayslip } from '../../api/payroll'
import { formatDate, formatCurrency } from '../../lib/utils'

export default function PayslipDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: payslip, isLoading } = useQuery({
    queryKey: ['payslip', id],
    queryFn: () => getPayslip(id),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!payslip) return null

  return (
    <div className="space-y-5 max-w-lg">
      <button
        onClick={() => navigate('/payroll/payslips')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Payslips
      </button>

      <div className="card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Payslip</p>
          <h2 className="text-2xl font-bold text-slate-900">{payslip.period_label}</h2>
        </div>

        {/* Meta */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-1">
          <p className="text-sm font-medium text-slate-700">
            {payslip.employee_name ?? `Employee #${payslip.employee_id}`}
          </p>
          <p className="text-xs text-slate-400">Generated: {formatDate(payslip.created_at)}</p>
          {payslip.period_start && (
            <p className="text-xs text-slate-400">
              Period: {formatDate(payslip.period_start)} – {formatDate(payslip.period_end)}
            </p>
          )}
        </div>

        {/* Earnings */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Earnings</p>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">Gross Pay</span>
            <span className="text-sm font-medium text-slate-800">{formatCurrency(payslip.gross)}</span>
          </div>
        </div>

        {/* Deductions */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Deductions</p>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">Income Tax</span>
            <span className="text-sm text-red-500">-{formatCurrency(payslip.income_tax)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">National Insurance</span>
            <span className="text-sm text-red-500">-{formatCurrency(payslip.ni)}</span>
          </div>
        </div>

        {/* Net */}
        <div className="flex justify-between py-3 bg-primary-50 rounded-lg px-4 mt-2">
          <span className="text-sm font-bold text-slate-800">Net Pay</span>
          <span className="text-lg font-bold text-primary-700">{formatCurrency(payslip.net)}</span>
        </div>

        {payslip.notes && (
          <p className="mt-4 text-xs text-slate-500">Notes: {payslip.notes}</p>
        )}
      </div>
    </div>
  )
}
