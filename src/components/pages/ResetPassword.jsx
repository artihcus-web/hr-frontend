import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

function ResetPassword() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!token) {
            setError('Invalid or missing reset token.')
            return
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (formData.newPassword.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    newPassword: formData.newPassword
                })
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(true)
                setTimeout(() => {
                    navigate('/login')
                }, 3000)
            } else {
                setError(data.message || 'Failed to reset password')
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-[#fef6ec] flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center max-w-md">
                    <p className="font-semibold">Invalid Link</p>
                    <p className="text-sm mt-2">This password reset link is invalid or missing a token.</p>
                    <Link to="/forgot-password" className="block mt-4 text-red-800 hover:underline">
                        Request a new one
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#fef6ec] flex items-center justify-center px-4 py-10">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiLock className="h-8 w-8 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
                    <p className="text-slate-500 mt-2">
                        Your new password must be different from previous used passwords.
                    </p>
                </div>

                {success ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                        <h3 className="text-green-800 font-semibold mb-2">Password Reset Successful!</h3>
                        <p className="text-green-600 text-sm">
                            Your password has been updated. Redirecting to login...
                        </p>
                        <div className="mt-4">
                            <Link to="/login" className="text-green-700 font-semibold hover:underline">
                                Login Now
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        name="newPassword"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                                        placeholder="Enter new password"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    name="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                                    placeholder="Confirm new password"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl text-white bg-orange-500 hover:bg-orange-600 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ResetPassword
