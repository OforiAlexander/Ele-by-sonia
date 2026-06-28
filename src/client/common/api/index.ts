import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use((config) => {
    (config as any)._t = performance.now();
    return config;
  });
}

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      const start = (response.config as any)._t;
      if (start !== undefined) {
        const ms = Math.round(performance.now() - start);
        const method = (response.config.method ?? 'GET').toUpperCase();
        const url    = response.config.url ?? '';
        const server = response.headers['x-response-time'] ?? '?';
        // eslint-disable-next-line no-console
        console.debug(`[api] ${method} ${url} — ${ms}ms total (server: ${server})`);
      }
    }
    return response;
  },
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
