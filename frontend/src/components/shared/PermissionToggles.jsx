import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../../lib/permissions'

export default function PermissionToggles({ value = {}, onChange, readOnly = false }) {
  const handleChange = (key, checked) => {
    if (readOnly || !onChange) return
    onChange({ ...value, [key]: checked })
  }

  return (
    <div className="space-y-5">
      {PERMISSION_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.keys.map(key => (
              <label
                key={key}
                className={`flex items-center gap-3 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={value[key] ?? false}
                  onChange={e => handleChange(key, e.target.checked)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">
                  {PERMISSION_LABELS[key]}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}