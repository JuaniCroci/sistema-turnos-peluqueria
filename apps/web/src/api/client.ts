import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// M5-b sumará:
// - request interceptor: lee token de localStorage y agrega Authorization
// - response interceptor: en 401 limpia el token y emite logout
