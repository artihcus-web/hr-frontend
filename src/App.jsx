import React from 'react'
import Layout from './components/layout/Layout'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Layout />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
