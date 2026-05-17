import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Edit2, X, Check, User, MapPin, Briefcase, Shield, Mail, Calendar } from 'lucide-react'
import { getMyProfile, updateMyProfile } from '../../api/users'
import { changePassword } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { formatDate, getInitials, getApiError } from '../../lib/utils'
import StatusBadge from '../../components/shared/StatusBadge'
import toast from 'react-hot-toast'

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof']

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    orange:  'bg-orange-50 text-orange-600',
    slate:   'bg-slate-100 text-slate-500',
  }
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { errors: pwErrors } } = useForm()

  const updateMutation = useMutation({
    mutationFn: (data) => updateMyProfile({
      title:           data.title || undefined,
      first_name:      data.first_name || undefined,
      last_name:       data.last_name || undefined,
      dob:             data.dob || undefined,
      address_line1:   data.address_line1 || undefined,
      address_line2:   data.address_line2 || undefined,
      address_city:    data.address_city || undefined,
      address_postcode: data.address_postcode || undefined,
      address_country: data.address_country || undefined,
    }),
    onSuccess: (data) => {
      setUser(data)
      qc.invalidateQueries({ queryKey: ['myProfile'] })
      toast.success('Profile updated')
      setEditing(false)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update profile')),
  })

  const pwMutation = useMutation({
    mutationFn: (data) => changePassword({
      current_password: data.current_password,
      new_password: data.new_password,
      confirm_password: data.new_password,
    }),
    onSuccess: () => {
      toast.success('Password changed')
      resetPw()
      setChangingPw(false)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to change password')),
  })

  const handleEdit = () => {
    reset({
      title:            profile?.title ?? '',
      first_name:       profile?.first_name ?? '',
      last_name:        profile?.last_name ?? '',
      dob:              profile?.dob ?? '',
      address_line1:    profile?.address?.line1 ?? '',
      address_line2:    profile?.address?.line2 ?? '',
      address_city:     profile?.address?.city ?? '',
      address_postcode: profile?.address?.postcode ?? '',
      address_country:  profile?.address?.country ?? '',
    })
    setEditing(true)
  }

  const p = profile

  return (
    <div className="space-y-5">

      {/* Hero banner */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-600 to-primary-400" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-primary-700 bg-primary-100">
              {getInitials(p?.first_name, p?.last_name)}
            </div>
            {!editing && (
              <button onClick={handleEdit} className="btn-secondary mb-1">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            )}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{p?.title} {p?.first_name} {p?.last_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-500">{p?.email}</span>
              </div>
              {p?.position?.title && (
                <div className="flex items-center gap-2 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm text-slate-500">{p?.position?.title} · {p?.business?.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={p?.role} />
              {p?.is_active && <StatusBadge status="active" />}
            </div>
          </div>
        </div>
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Personal */}
          <SectionCard icon={User} title="Personal Information" color="primary">
            <div className="space-y-4">
              <InfoRow label="Title" value={p?.title} />
              <InfoRow label="First Name" value={p?.first_name} />
              <InfoRow label="Last Name" value={p?.last_name} />
              <InfoRow label="Date of Birth" value={formatDate(p?.dob)} />
              <InfoRow label="Member Since" value={formatDate(p?.created_at)} />
            </div>
          </SectionCard>

          {/* Address */}
          <SectionCard icon={MapPin} title="Address" color="orange">
            <div className="space-y-4">
              <InfoRow label="Address Line 1" value={p?.address?.line1} />
              <InfoRow label="Address Line 2" value={p?.address?.line2} />
              <InfoRow label="City" value={p?.address?.city} />
              <InfoRow label="Postcode" value={p?.address?.postcode} />
              <InfoRow label="Country" value={p?.address?.country} />
            </div>
          </SectionCard>

          {/* Work + Security */}
          <div className="space-y-5">
            <SectionCard icon={Briefcase} title="Work" color="green">
              <div className="space-y-4">
                <InfoRow label="Business" value={p?.business?.name} />
                <InfoRow label="Position" value={p?.position?.title} />
                <InfoRow label="Rank" value={p?.position?.rank} />
                <InfoRow label="Role" value={p?.role} />
              </div>
            </SectionCard>

            <SectionCard icon={Shield} title="Security" color="slate">
              {!changingPw ? (
                <button onClick={() => setChangingPw(true)} className="btn-secondary w-full justify-center">
                  Change Password
                </button>
              ) : (
                <form onSubmit={handlePw(d => pwMutation.mutate(d))} className="space-y-3">
                  <div>
                    <label className="label">Current Password</label>
                    <input type="password" className="input" {...regPw('current_password', { required: 'Required' })} />
                    {pwErrors.current_password && <p className="form-error">{pwErrors.current_password.message}</p>}
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input type="password" className="input" {...regPw('new_password', { required: 'Required' })} />
                    {pwErrors.new_password && <p className="form-error">{pwErrors.new_password.message}</p>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="btn-primary flex-1 justify-center" disabled={pwMutation.isPending}>
                      {pwMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => { setChangingPw(false); resetPw() }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </SectionCard>
          </div>
        </div>
      ) : (
        /* Edit form */
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-5">Edit Profile</h3>
          <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Title</label>
                <select className="input" {...register('title')}>
                  <option value="">—</option>
                  {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">First Name</label>
                <input className="input" {...register('first_name', { required: 'Required' })} />
                {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" {...register('last_name', { required: 'Required' })} />
                {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input max-w-xs" {...register('dob')} />
            </div>

            <hr className="border-slate-100" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</p>

            <div>
              <label className="label">Address Line 1</label>
              <input className="input" {...register('address_line1')} />
            </div>
            <div>
              <label className="label">Address Line 2</label>
              <input className="input" {...register('address_line2')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="label">City</label>
                <input className="input" {...register('address_city')} />
              </div>
              <div>
                <label className="label">Postcode</label>
                <input className="input" {...register('address_postcode')} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" {...register('address_country')} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
