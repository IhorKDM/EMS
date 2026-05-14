const VAR = {
  // Holiday 
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',

  // User
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',

  // Roles
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-slate-100 text-slate-600',

  // Business types
  office: 'bg-indigo-100 text-indigo-700',
  retail: 'bg-pink-100 text-pink-700',
  warehouse: 'bg-orange-100 text-orange-700',
  restaurant: 'bg-red-100 text-red-700',
  other: 'bg-slate-100 text-slate-600',

  // Pay types
  hourly: 'bg-teal-100 text-teal-700',
  daily: 'bg-cyan-100 text-cyan-700',
  contract: 'bg-violet-100 text-violet-700',
}

export default function StatusBadge({ status }) {
  const classes = VAR[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${classes}`}>
      {status}
    </span>
  )
}