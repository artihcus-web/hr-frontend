import React from 'react'
import { Toaster } from 'react-hot-toast'
import Header from '../header/Header'
import Footer from '../footer/Footer'
import Sidebar from './Sidebar'
import Routers from '../routers/Routers'
import { BrowserRouter as Router, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function LayoutContent() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const publicRoutes = ['/', '/login', '/signup']
  const isPublicRoute = publicRoutes.includes(location.pathname)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 transition-colors">
        <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
      </div>
    )
  }

  // For public routes (login, signup, etc.), render page without header/footer/sidebar
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
        <Routers />
      </div>
    )
  }

  // Authenticated layout with sidebar on the left and header/content on the right
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors">
      {/* Sidebar - fixed on the left */}
      {user && <Sidebar />}

      {/* Right side: header, content, footer */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Sticky Header aligned with content (starts to the right of sidebar) */}
        <Header />

        {/* Main Content - let the window handle scrolling so sticky elements work with viewport */}
        <main className="flex-1 bg-white dark:bg-gray-950 transition-colors">
          <Routers />
        </main>

        <Footer />
      </div>
    </div>
  )
}

function Layout() {
  return (
    <Router>
      <LayoutContent />
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </Router>
  )
}

export default Layout
