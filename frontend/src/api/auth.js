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
  const { data: res } = await client.post('/auth/change-password', {
    current_password: data.current_password,
    new_password: data.new_password,
    confirm_password: data.new_password,
  })
  return res
}