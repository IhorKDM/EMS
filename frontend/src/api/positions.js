import client from './client'

export async function listPositions(businessId) {
  const params = businessId ? { business_id: businessId } : {}
  const { data } = await client.get('/positions', { params })
  return data
}

export async function getPosition(id) {
  const { data } = await client.get(`/positions/${id}`)
  return data
}

export async function createPosition(data) {
  const { data: res } = await client.post('/positions', data)
  return res
}

export async function updatePosition(id, data) {
  const { data: res } = await client.patch(`/positions/${id}`, data)
  return res
}

export async function deletePosition(id) {
  const { data: res } = await client.delete(`/positions/${id}`)
  return res
}