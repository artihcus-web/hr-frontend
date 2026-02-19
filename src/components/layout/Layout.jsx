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
  const { user, loading, menuConfig, menuConfigLoading } = useAuth()
  const publicRoutes = ['/', '/login', '/signup']
  const isPublicRoute = publicRoutes.includes(location.pathname)

  // Show loading while:
  // 1. User is being fetched (initial auth check)
  // 2. Menu config is loading after user is loaded (on reload)
  // This ensures everything is ready before showing UI
  if (loading || (user && !menuConfig && menuConfigLoading)) {
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
  const isKnowYourEmployee = location.pathname === '/know-your-employee'
  return (
    <div className={`bg-gray-50 dark:bg-gray-950 flex transition-colors ${isKnowYourEmployee ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Sidebar - fixed on the left */}
      {user && <Sidebar />}

      {/* Right side: header, content, footer */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {/* Sticky Header aligned with content (starts to the right of sidebar) */}
        <Header />

        {/* Main Content - overflow-hidden for know-your-employee (sticky no-scroll), else scroll */}
        <main className={`flex-1 min-h-0 bg-white dark:bg-gray-950 transition-colors ${isKnowYourEmployee ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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
