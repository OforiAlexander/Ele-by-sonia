import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/account')
    ) {
      window.location.href = '/account/';
    }
    return Promise.reject(error);
  },
);

export default api;
