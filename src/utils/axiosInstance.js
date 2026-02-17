import axios from 'axios'
import toast from './toast'
import { getApiBaseUrl } from '../config/apiConfig.js'

// Create axios instance (uses same base URL as profile images for deploy consistency)
const axiosInstance = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request Interceptor: Attach Token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response Interceptor: Handle Global Errors
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Check if network error (server down/unreachable)
        if (!error.response) {
            toast.error('Server Issue: Unable to connect to the server')
            return Promise.reject(error)
        }

        // Check for 5xx Server Errors - show actual API message when available
        if (error.response.status >= 500) {
            const msg = error.response?.data?.message
            toast.error(msg || 'Server Error: Something went wrong on our end')
        }

        // Check for 401 Unauthorized globally
        if (error.response.status === 401) {
            // Check if not already on login page to avoid loops
            if (!window.location.pathname.includes('/login')) {
                toast.error('Session Expired. Please login again.')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                // Force redirect to login
                window.location.href = '/login'
            }
        }

        return Promise.reject(error)
    }
)

export default axiosInstance
