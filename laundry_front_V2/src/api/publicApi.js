import axios from 'axios'

const BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

export const getPublicCategories = () =>
  axios.get(`${BASE_URL}/api/public/catalog/categories`).then(r => r.data)

export const submitPublicOrder = (data) =>
  axios.post(`${BASE_URL}/api/public/orders`, data).then(r => r.data)
