import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { changePassword } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { getApiError } from '../../lib/utils'

const RULES = [
  { label: '8+ characters',     test: v => v.length >= 8 },
  { label: 'Uppercase letter',  test: v => /[A-Z]/.test(v) },
  { label: 'Lowercase letter',  test: v => /[a-z]/.test(v) },
  { label: 'Number',            test: v => /[0-9]/.test(v) },
  { label: 'Special character', test: v => /[^A-Za-z0-9]/.test(v) },
]

export default function ForceChangePasswordPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  const newPassword = watch('new_password', '')

  const onSubmit = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const updated = await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      setUser({ ...updated, is_first_login: false })
      toast.success('Password changed successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(getApiError(err, 'Failed to change password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="/logo-light.png" alt="EMS" className="logo h-32 w-auto object-contain mx-auto mb-4" />
        </div>

        <div className="card p-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-amber-800 font-medium">Set your permanent password</p>
            <p className="text-xs text-amber-600 mt-0.5">You must change your temporary password before continuing.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('current_password', { required: 'Required' })}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.current_password && <p className="form-error">{errors.current_password.message}</p>}
            </div>

            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('new_password', { required: 'Required' })}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="mt-2 space-y-1">
                {RULES.map(rule => {
                  const ok = rule.test(newPassword)
                  return (
                    <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-slate-400'}`}>
                      {ok
                        ? <CheckCircle className="w-3.5 h-3.5" />
                        : <XCircle className="w-3.5 h-3.5" />}
                      {rule.label}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                {...register('confirm_password', { required: 'Required' })}
              />
              {errors.confirm_password && <p className="form-error">{errors.confirm_password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}