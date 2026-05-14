import client from './client'

export async function listHolidays(params = {}) {
  const { data } = await client.get('/holidays', { params })
  return data
}

export async function getHoliday(id) {
  const { data } = await client.get(`/holidays/${id}`)
  return data
}

export async function createHoliday(data) {
  const { data: res } = await client.post('/holidays', data)
  return res
}

export async function reviewHoliday(id, data) {
  const { data: res } = await client.post(`/holidays/${id}/review`, data)
  return res
}