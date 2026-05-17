import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Calendar, List, Trash2, Pencil } from 'lucide-react'
import { listShifts, deleteShift } from '../../api/schedule'
import { listUsers } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { canDo } from '../../lib/permissions'
import { formatDate } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import EmptyState from '../../components/shared/EmptyState'
import toast from 'react-hot-toast'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = [
  'bg-primary-100 text-primary-700 border-primary-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-violet-100 text-violet-700 border-violet-200',
]

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function SchedulePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [view, setView] = useState('calendar')
  const [weekOffset, setWeekOffset] = useState(0)
  const [confirmId, setConfirmId] = useState(null)

  const isEmployee = user?.role === 'employee'
  const canManage = canDo(user, 'can_manage_schedule')

  const weekDates = getWeekDates(weekOffset)
  const weekStart = weekDates[0].toISOString().split('T')[0]
  const weekEnd = weekDates[6].toISOString().split('T')[0]

  const { data: allShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => listShifts(),
  })

  // Filter client-side to current week
  const shifts = allShifts?.filter(s => s.work_date >= weekStart && s.work_date <= weekEnd)

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: !isEmployee,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteShift(confirmId),
    onSuccess: () => {
      toast.success('Shift deleted')
      qc.invalidateQueries({ queryKey: ['shifts'] })
      setConfirmId(null)
    },
    onError: () => toast.error('Failed to delete shift'),
  })

  // Build employee lookup map
  const users = usersData?.users ?? usersData ?? []
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  // Build employee color map
  const employeeIds = [...new Set(shifts?.map(s => s.employee_id) ?? [])]
  const colorMap = Object.fromEntries(employeeIds.map((id, i) => [id, COLORS[i % COLORS.length]]))

  // Group shifts by date
  const shiftsByDate = {}
  shifts?.forEach(s => {
    if (!shiftsByDate[s.work_date]) shiftsByDate[s.work_date] = []
    shiftsByDate[s.work_date].push(s)
  })

  const weekLabel = `${weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div>
      <PageHeader
        title={isEmployee ? 'My Schedule' : 'Schedule'}
        actions={
          (canManage || user?.role === 'admin') && (
            <button onClick={() => navigate('/schedule/shifts/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Shift
            </button>
          )
        }
      />

      {/* Controls */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 w-52 text-center">{weekLabel}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-primary-600 hover:underline ml-1">
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`p-3 text-center border-r border-slate-100 last:border-0 ${isToday ? 'bg-primary-50' : ''}`}>
                  <p className="text-xs text-slate-400">{DAYS[i]}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-primary-600' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-7 min-h-48">
            {weekDates.map((date, i) => {
              const key = date.toISOString().split('T')[0]
              const dayShifts = shiftsByDate[key] ?? []
              return (
                <div key={i} className="p-2 border-r border-slate-100 last:border-0 space-y-1">
                  {dayShifts.map(s => (
                    <div
                      key={s.id}
                      className={`rounded-lg border px-2 py-1 text-xs cursor-pointer ${colorMap[s.employee_id] ?? COLORS[0]}`}
                      onClick={() => (canManage || user?.role === 'admin') && navigate(`/schedule/shifts/${s.id}/edit`)}
                    >
                      <p className="font-medium truncate">
                        {isEmployee ? `${s.start_time}–${s.end_time}` : `${userMap[s.employee_id]?.first_name ?? ''} ${userMap[s.employee_id]?.last_name?.[0] ?? ''}.`}
                      </p>
                      <p className="opacity-70">{s.start_time}–{s.end_time}</p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="card">
          {shifts?.length ? (
            <div className="divide-y divide-slate-100">
              {shifts.sort((a, b) => a.work_date.localeCompare(b.work_date)).map(s => (
                <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-sm font-medium text-slate-800">{formatDate(s.work_date)}</p>
                  </div>
                  {!isEmployee && (
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">
                        {userMap[s.employee_id]?.first_name} {userMap[s.employee_id]?.last_name}
                      </p>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">{s.start_time} – {s.end_time}</p>
                    {s.notes && <p className="text-xs text-slate-400 mt-0.5">{s.notes}</p>}
                  </div>
                  {(canManage || user?.role === 'admin') && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => navigate(`/schedule/shifts/${s.id}/edit`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmId(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No shifts this week"
              description="No shifts scheduled for this period"
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Shift"
        description="Are you sure you want to delete this shift?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}