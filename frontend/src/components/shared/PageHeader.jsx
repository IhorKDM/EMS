import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PageHeader({ title, subtitle, backTo, actions }) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}