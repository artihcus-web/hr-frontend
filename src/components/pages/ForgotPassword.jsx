import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMail, FiArrowLeft } from 'react-icons/fi'

function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess(false)

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            // We always show success message for security reasons (unless server error)
            if (response.ok || response.status === 200) {
                setSuccess(true)
            } else {
                const data = await response.json()
                setError(data.message || 'Something went wrong')
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#fef6ec] flex items-center justify-center px-4 py-10">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8">
                <div className="mb-6">
                    <Link to="/login" className="flex items-center text-slate-500 hover:text-orange-500 transition-colors">
                        <FiArrowLeft className="mr-2" /> Back to Login
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiMail className="h-8 w-8 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Forgot Password?</h2>
                    <p className="text-slate-500 mt-2">
                        No worries! Enter your email and we'll send you reset instructions.
                    </p>
                </div>

                {success ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                        <h3 className="text-green-800 font-semibold mb-2">Check your email</h3>
                        <p className="text-green-600 text-sm">
                            We've sent password reset instructions to <strong>{email}</strong>
                        </p>
                        <p className="text-green-600 text-sm mt-4">
                            Didn't receive the email? Check your spam folder or try again.
                        </p>
                        <button
                            onClick={() => setSuccess(false)}
                            className="mt-4 text-green-700 font-semibold text-sm hover:underline"
                        >
                            Try another email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
                                placeholder="Enter your registered email"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl text-white bg-orange-500 hover:bg-orange-600 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ForgotPassword
