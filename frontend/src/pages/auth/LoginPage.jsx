import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getApiError } from '../../lib/utils'
import { login, getMe, forgotPassword } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => setDone(true),
    onError: () => setDone(true), // always show success to avoid email enumeration
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Check your email</h3>
            <p className="text-sm text-slate-500 mb-5">
              If that email is registered, a temporary password has been sent.
              Use it to log in, then go to{' '}
              <span className="font-medium text-slate-700">My Profile → Security → Change Password</span>{' '}
              to set a permanent one.
            </p>
            <button onClick={onClose} className="btn-primary w-full justify-center">
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Forgot your password?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Enter your email and we'll send you a temporary password.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && email && mutation.mutate()}
                  autoFocus
                />
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={!email || mutation.isPending}
                className="btn-primary w-full justify-center"
              >
                {mutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : 'Send Temporary Password'}
              </button>

              <button
                onClick={onClose}
                className="btn-secondary w-full justify-center"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm()
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setAuthError('')
    try {
      const tokens = await login(email, password)
      setAuth(null, tokens.access_token, tokens.refresh_token)
      const user = await getMe()
      setAuth(user, tokens.access_token, tokens.refresh_token)
      qc.clear()
      if (user.is_first_login) {
        navigate('/change-password')
      } else {
        toast.success(`Welcome back, ${user.first_name}!`)
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = getApiError(err, 'Invalid email or password')
      setAuthError(msg)
      setValue('password', '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center p-4">
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="/logo-light.png" alt="EMS" className="logo h-40 w-auto object-contain mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {authError && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{authError}</p>
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input
                className={`input ${authError || errors.email ? 'border-red-400 focus:ring-red-200' : ''}`}
                type="email"
                placeholder="you@company.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className={`input pr-10 ${authError || errors.password ? 'border-red-400 focus:ring-red-200' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}