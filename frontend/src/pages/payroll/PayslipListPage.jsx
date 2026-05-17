import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, FileText } from 'lucide-react'
import { listPayslips } from '../../api/payroll'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatCurrency } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'

export default function PayslipListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isEmployee = user?.role === 'employee'

  const { data, isLoading } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => listPayslips(),
  })

  const payslips = data?.payslips ?? data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title={isEmployee ? 'My Payslips' : 'Payslips'} />

      {payslips.length === 0 ? (
        <EmptyState icon={FileText} title="No payslips yet" message="Generated payslips will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {!isEmployee && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payslips.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/payroll/payslips/${p.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  {!isEmployee && (
                    <td className="px-4 py-3 text-slate-700">{p.employee_name ?? `#${p.employee_id}`}</td>
                  )}
                  <td className="px-4 py-3 text-slate-700">{p.period_label}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(p.gross)}</td>
                  <td className="px-4 py-3 font-medium text-green-700">{formatCurrency(p.net)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}