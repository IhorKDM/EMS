import client from './client'

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password })
  return data
}

export async function getMe() {
  const { data } = await client.get('/auth/me')
  return data
}

export async function changePassword(data) {
  const { data: res } = await client.post('/auth/change-password', data)
  return res
}