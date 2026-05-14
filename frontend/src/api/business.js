import client from './client'

export async function listBusinesses() {
  const { data } = await client.get('/business')
  return data
}

export async function getBusiness(id) {
  const { data } = await client.get(`/business/${id}`)
  return data
}

export async function createBusiness(data) {
  const { data: res } = await client.post('/business', data)
  return res
}

export async function updateBusiness(id, data) {
  const { data: res } = await client.patch(`/business/${id}`, data)
  return res
}

export async function deleteBusiness(id) {
  const { data: res } = await client.delete(`/business/${id}`)
  return res
}

export async function listSections(businessId) {
  const { data } = await client.get(`/business/${businessId}/sections`)
  return data
}

export async function createSection(businessId, data) {
  const { data: res } = await client.post(`/business/${businessId}/sections`, data)
  return res
}

export async function updateSection(businessId, sectionId, data) {
  const { data: res } = await client.patch(`/business/${businessId}/sections/${sectionId}`, data)
  return res
}

export async function deleteSection(businessId, sectionId) {
  const { data: res } = await client.delete(`/business/${businessId}/sections/${sectionId}`)
  return res
}