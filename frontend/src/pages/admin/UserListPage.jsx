import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, Search } from 'lucide-react'
import { listUsers } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { canDo } from '../../lib/permissions'
import { formatDate } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import DataTable from '../../components/shared/DataTable'
import StatusBadge from '../../components/shared/StatusBadge'

export default function UserListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })

  const users = data?.users ?? []

  const filtered = users.filter(u => {
    const name = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase())
    const matchRole = roleFilter ? u.role === roleFilter : true
    return matchSearch && matchRole
  })

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: u => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {u.first_name?.[0]}{u.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium text-slate-800">{u.title} {u.first_name} {u.last_name}</p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: u => <StatusBadge status={u.role} />,
    },
    {
      key: 'business',
      label: 'Business',
      render: u => <span className="text-sm text-slate-600">{u.business?.name || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: u => <StatusBadge status={u.is_active ? 'active' : 'inactive'} />,
    },
    {
      key: 'joined',
      label: 'Joined',
      render: u => <span className="text-sm text-slate-500">{formatDate(u.created_at)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'user' : 'users'}`}
        actions={
          canDo(user, 'can_add_user') && (
            <button onClick={() => navigate('/admin/users/new')} className="btn-primary">
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-40"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          onRowClick={u => navigate(`/admin/users/${u.id}`)}
          emptyIcon={Users}
          emptyTitle="No users found"
          emptyDescription="Try adjusting your search or filters"
        />
      </div>
    </div>
  )
}