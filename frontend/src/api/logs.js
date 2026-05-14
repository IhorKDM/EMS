import client from './client'

export async function listLogs(params = {}) {
  const { data } = await client.get('/logs', { params })
  return data
}

export async function getLog(id) {
  const { data } = await client.get(`/logs/${id}`)
  return data
}