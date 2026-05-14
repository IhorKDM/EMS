import client from './client'

export async function listUsers() {
  const { data } = await client.get('/admin/users')
  return data
}

export async function getUser(id) {
  const { data } = await client.get(`/admin/users/${id}`)
  return data
}

export async function createEmployee(data) {
  const { data: res } = await client.post('/admin/employees', data)
  return res
}

export async function createManager(data) {
  const { data: res } = await client.post('/admin/managers', data)
  return res
}

export async function updateUser(id, data) {
  const { data: res } = await client.patch(`/admin/users/${id}`, data)
  return res
}

export async function deleteUser(id) {
  const { data: res } = await client.delete(`/admin/users/${id}`)
  return res
}

export async function promoteUser(id, data) {
  const { data: res } = await client.post(`/admin/users/${id}/promote`, data)
  return res
}