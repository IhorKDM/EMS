import client from './client'

export async function listShifts(params = {}) {
  const { data } = await client.get('/schedule', { params })
  return data
}

export async function getShift(id) {
  const { data } = await client.get(`/schedule/${id}`)
  return data
}

export async function createShift(data) {
  const { data: res } = await client.post('/schedule', data)
  return res
}

export async function updateShift(id, data) {
  const { data: res } = await client.patch(`/schedule/${id}`, data)
  return res
}

export async function deleteShift(id) {
  const { data: res } = await client.delete(`/schedule/${id}`)
  return res
}