import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// Request interceptor - attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (err) => Promise.reject(err)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const { data } = await axios.post('/api/auth/refresh', { refreshToken });
                    localStorage.setItem('token', data.data.token);
                    originalRequest.headers.Authorization = `Bearer ${data.data.token}`;
                    return api(originalRequest);
                } catch {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                }
            } else {
                window.location.href = '/login';
            }
        }

        const message = error.response?.data?.message || 'Something went wrong. Please try again.';
        if (error.response?.status !== 401) toast.error(message);

        return Promise.reject(error);
    }
);

export default api;
