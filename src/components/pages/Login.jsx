import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import toast from '../../utils/toast'
import axiosInstance from '../../utils/axiosInstance'
import { getProfileImageUrl } from '../../config/apiConfig'
function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)

    try {
      // Step 1: Send login credentials to backend
      const res = await axiosInstance.post('/api/auth/login', formData)
      const data = res.data

      toast.success('Login successful! Welcome back.')

      console.log('[Login] API response user:', { hasUser: !!data.user, profileImage: data.user?.profileImage, _id: data.user?._id, id: data.user?.id })

      // Step 2: Store token and set user (login response)
      login(data.token, data.user)

      // Step 3: Fetch /me so header gets full user with profileImage (same as after refresh)
      try {
        const meRes = await axiosInstance.get('/api/auth/me')
        const meUser = meRes.data?.user
        console.log('[Login] /me response user:', { hasUser: !!meUser, profileImage: meUser?.profileImage, _id: meUser?._id, id: meUser?.id })
        if (meUser) {
          login(data.token, meUser)
          if (meUser.profileImage) {
            const imgUrl = getProfileImageUrl(meUser.profileImage, meUser._id || meUser.id)
            if (imgUrl?.startsWith('http')) new Image().src = imgUrl
          }
        }
      } catch (e) {
        console.log('[Login] /me failed:', e?.message)
      }

      // Step 4: Navigate
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect')
      const targetPath = redirect || (data.user?.role === 'admin' ? '/admin' : '/dashboard')
      queueMicrotask(() => navigate(targetPath))
    } catch (error) {
      // Handle client errors (4xx) like invalid credentials
      if (error.response && error.response.status < 500) {
        toast.error(error.response.data.message || 'Login failed')
      }
      // Server errors (5xx) and Network errors are handled by axiosInstance interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#fef6ec] dark:bg-gray-950 flex items-center justify-center px-4 py-10 transition-colors">
      <div className="max-w-6xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden grid lg:grid-cols-2 max-h-[90vh] transition-colors border border-transparent dark:border-gray-800">
        {/* Left side - form */}
        <div className="px-10 py-10 lg:py-16 flex flex-col justify-center overflow-y-auto">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-gray-100">
              Welcome back!
            </h1>
            <p className="text-sm md:text-base text-slate-500 dark:text-gray-400 max-w-md">
              Simplify your workflow and boost your productivity with Artihcus.{' '}
              <span className="text-orange-500 dark:text-orange-400 font-semibold">Get started.</span>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>


            <div className="space-y-4">
              {/* Username */}
              <div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-full bg-[#eef4ff] dark:bg-gray-800 border border-transparent dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors"
                  placeholder="Employee ID / Email"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 pr-10 rounded-full bg-[#eef4ff] dark:bg-gray-800 border border-transparent dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 focus:outline-none"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full flex justify-center py-3 px-4 rounded-full text-sm font-semibold text-white bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs md:text-sm text-slate-500 dark:text-gray-500 transition-colors">
                Contact your HR administrator for access.
              </p>
            </div>
          </form>
        </div>

        {/* Right side - illustration / branding */}
        <div className="hidden lg:flex relative bg-[#fff3e0] dark:bg-gray-800 items-center justify-center overflow-hidden transition-colors">
          <div className="absolute -top-10 right-10 h-10 w-10 rounded-full bg-[#ffb74d] opacity-60" />
          <div className="absolute top-16 left-16 h-12 w-12 rounded-full bg-[#ffd180] opacity-60" />
          <div className="absolute bottom-16 right-20 h-12 w-12 rounded-full bg-[#ffe0b2] opacity-60" />

          <div className="relative flex flex-col items-center space-y-8 z-10">
            <div className="relative">
              <div className="h-72 w-72 rounded-full bg-[#ffcc80] dark:bg-gray-700 flex items-center justify-center transition-colors">
                <div className="h-36 w-36 rounded-full bg-orange-500 dark:bg-orange-600 flex items-center justify-center transition-colors">
                  <div className="h-20 w-20 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-orange-500 dark:text-orange-400 text-3xl transition-colors">
                    👤
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md px-10 py-4 flex items-center space-x-3 transition-colors border border-transparent dark:border-gray-800">
              <div className="h-10 w-10 rounded-full bg-orange-500 dark:bg-orange-600 flex items-center justify-center text-white font-bold text-xl transition-colors">
                A
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-gray-100">Artihcus</span>
            </div>

            <p className="text-center text-slate-700 dark:text-gray-400 text-sm max-w-xs transition-colors">
              Make your work easier and organized<br />with{' '}
              <span className="text-orange-500 dark:text-orange-400 font-semibold">Artihcus</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

