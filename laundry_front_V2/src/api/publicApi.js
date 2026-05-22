import axios from 'axios';

const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

export const getPublicCategories = () =>
  publicClient.get('/public/catalog/categories');

export const submitPublicOrder = (data) =>
  publicClient.post('/public/orders', data);
