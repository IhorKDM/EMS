import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getApiError } from '../../lib/utils'
import { login, getMe } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      const tokens = await login(email, password)
      setAuth(null, tokens.access_token, tokens.refresh_token)
      const user = await getMe()
      setAuth(user, tokens.access_token, tokens.refresh_token)
      if (user.is_first_login) {
        navigate('/change-password')
      } else {
        toast.success(`Welcome back, ${user.first_name}!`)
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(getApiError(err, 'Invalid email or password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="/logo-light.png" alt="EMS" className="logo h-40 w-auto object-contain mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                className={`input ${errors.email ? 'border-red-400' : ''}`}
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
                  className={`input pr-10 ${errors.password ? 'border-red-400' : ''}`}
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