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
        <div className="min-h-screen bg-[#fef6ec] dark:bg-gray-950 flex items-center justify-center px-4 py-10 transition-colors">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden p-8 border border-transparent dark:border-gray-800 transition-colors">
                <div className="mb-6">
                    <Link to="/login" className="flex items-center text-slate-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                        <FiArrowLeft className="mr-2" /> Back to Login
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                        <FiMail className="h-8 w-8 text-orange-500 dark:text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Forgot Password?</h2>
                    <p className="text-slate-500 dark:text-gray-400 mt-2">
                        No worries! Enter your email and we'll send you reset instructions.
                    </p>
                </div>

                {success ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center transition-colors">
                        <h3 className="text-green-800 dark:text-green-300 font-semibold mb-2">Check your email</h3>
                        <p className="text-green-600 dark:text-green-400 text-sm">
                            We've sent password reset instructions to <strong>{email}</strong>
                        </p>
                        <p className="text-green-600 dark:text-green-400 text-sm mt-4">
                            Didn't receive the email? Check your spam folder or try again.
                        </p>
                        <button
                            onClick={() => setSuccess(false)}
                            className="mt-4 text-green-700 dark:text-green-400 font-semibold text-sm hover:underline"
                        >
                            Try another email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm transition-colors">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2 transition-colors">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors"
                                placeholder="Enter your registered email"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl text-white bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
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
