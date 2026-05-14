import client from './client'

export async function getMyProfile() {
  const { data } = await client.get('/users/me')
  return data
}

export async function updateMyProfile(data) {
  const { data: res } = await client.patch('/users/me', data)
  return res
}