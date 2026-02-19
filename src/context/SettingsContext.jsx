import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axiosInstance from '../utils/axiosInstance'

const SettingsContext = createContext(null)

const defaultSettings = {
  sidebarLogoUrl: '',
  appName: 'Artihcus',
  faviconUrl: '',
  holidayCalendarTitle: 'Holiday Calendar',
  holidayCalendarSubtitle: 'Organization holidays',
  holidayYearsPublished: []
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [settingsVersion, setSettingsVersion] = useState(0)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/cms/settings')
      if (res.data?.settings) {
        setSettings({ ...defaultSettings, ...res.data.settings })
        setSettingsVersion((v) => v + 1)
      }
    } catch (error) {
      console.error('[SettingsContext] Failed to fetch settings:', error?.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <SettingsContext.Provider value={{ settings, loading, refetchSettings: fetchSettings, settingsVersion }}>
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    return {
      settings: defaultSettings,
      loading: false,
      refetchSettings: () => {},
      settingsVersion: 0
    }
  }
  return ctx
}
