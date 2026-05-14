import { Loader2 } from 'lucide-react'
import EmptyState from './EmptyState'

export default function DataTable({ columns, data, loading, onRowClick, emptyTitle, emptyDescription, emptyIcon }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle ?? 'No results'}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map(col => (
              <th
                key={col.key}
                className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-slate-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}