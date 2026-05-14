import client from './client'

export async function getTaxConfig(businessId) {
  const { data } = await client.get(`/payroll/tax-config/${businessId}`)
  return data
}

export async function saveTaxConfig(businessId, data) {
  const { data: res } = await client.post(`/payroll/tax-config?business_id=${businessId}`, data)
  return res
}

export async function getPayConfig(employeeId) {
  const { data } = await client.get(`/payroll/pay-config/${employeeId}`)
  return data
}

export async function createPayConfig(data) {
  const { data: res } = await client.post('/payroll/pay-config', data)
  return res
}

export async function updatePayConfig(employeeId, data) {
  const { data: res } = await client.patch(`/payroll/pay-config/${employeeId}`, data)
  return res
}

export async function listPayslips(params = {}) {
  const { data } = await client.get('/payroll/payslips', { params })
  return data
}

export async function getPayslip(id) {
  const { data } = await client.get(`/payroll/payslips/${id}`)
  return data
}

export async function generatePayslip(data) {
  const { data: res } = await client.post('/payroll/payslips', data)
  return res
}