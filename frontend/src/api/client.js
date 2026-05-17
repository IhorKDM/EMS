import axios from 'axios'
import toast from 'react-hot-toast'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})

client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('ems-auth')
  if (raw) {
    const { state } = JSON.parse(raw)
    if (state?.accessToken) {
      config.headers.Authorization = `Bearer ${state.accessToken}`
    }
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('ems-auth')
      window.location.href = '/login'
      toast.error('Session expired, please sign in again')
    }

    if (status === 403) {
      toast.error('You do not have permission to do that')
    }

    if (status >= 500) {
      toast.error('Server error, please try again later')
    }

    return Promise.reject(error)
  }
)

export default client