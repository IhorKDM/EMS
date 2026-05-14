import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
  }).format(amount)
}

export function formatPercent(value) {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

export function getInitials(firstName, lastName) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

export function payTypeLabel(type) {
  return { hourly: 'Hourly', daily: 'Daily', contract: 'Contract' }[type] ?? type
}

export function calcGross(payType, rate, contractAmount, hoursWorked = 0, daysWorked = 0) {
  if (payType === 'contract') return contractAmount ?? 0
  if (payType === 'hourly') return (rate ?? 0) * hoursWorked
  if (payType === 'daily') return (rate ?? 0) * daysWorked
  return 0
}

export function calcNet(gross, incomeTax, niRate) {
  const tax = gross * (incomeTax ?? 0)
  const ni = gross * (niRate ?? 0)
  return gross - tax - ni
}

export function getApiError(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg).join(', ')
  return fallback
}