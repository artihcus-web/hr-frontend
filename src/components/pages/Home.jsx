import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to dashboard if already logged in
    const token = localStorage.getItem('token')
    if (token) {
      navigate('/dashboard')
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl font-extrabold text-white mb-4">
          Welcome to My App
        </h1>
        <p className="text-xl text-indigo-100 mb-8">
          Get started by creating an account or signing in
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/signup"
            className="bg-white text-indigo-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition duration-200 shadow-lg"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition duration-200 shadow-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
