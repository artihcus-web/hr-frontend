import React, { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../../context/SettingsContext'
import axiosInstance from '../../../utils/axiosInstance'
import toast from '../../../utils/toast'
import { FiSave, FiCalendar, FiImage, FiType, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import LoadingSpinner from '../../common/LoadingSpinner'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CMS = () => {
  const { settings, refetchSettings } = useSettings()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    sidebarLogoUrl: '',
    appName: '',
    faviconUrl: '',
    holidayCalendarTitle: '',
    holidayCalendarSubtitle: ''
  })
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editRow, setEditRow] = useState({ month: 0, day: 1, name: '' })

  useEffect(() => {
    setForm({
      sidebarLogoUrl: settings.sidebarLogoUrl || '',
      appName: settings.appName || '',
      faviconUrl: settings.faviconUrl || '',
      holidayCalendarTitle: settings.holidayCalendarTitle || '',
      holidayCalendarSubtitle: settings.holidayCalendarSubtitle || ''
    })
  }, [settings])

  const fetchHolidays = useCallback(async () => {
    setHolidaysLoading(true)
    try {
      const res = await axiosInstance.get(`/api/cms/holidays?year=${holidayYear}`)
      setHolidays(res.data.holidays || [])
    } catch (error) {
      console.error('Fetch holidays error:', error)
      toast.error('Failed to load holidays')
      setHolidays([])
    } finally {
      setHolidaysLoading(false)
    }
  }, [holidayYear])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axiosInstance.put('/api/cms/settings', form)
      toast.success('Settings saved')
      refetchSettings()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleAddHoliday = async (e) => {
    e.preventDefault()
    const { month, day, name } = editRow
    if (!name?.trim()) {
      toast.error('Holiday name is required')
      return
    }
    setSaving(true)
    try {
      await axiosInstance.post('/api/cms/holidays', {
        year: holidayYear,
        month: parseInt(month, 10),
        day: parseInt(day, 10),
        name: name.trim()
      })
      toast.success('Holiday added')
      setEditRow({ month: 0, day: 1, name: '' })
      fetchHolidays()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add holiday')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateHoliday = async (e) => {
    e.preventDefault()
    if (!editingId) return
    const { month, day, name } = editRow
    if (!name?.trim()) {
      toast.error('Holiday name is required')
      return
    }
    setSaving(true)
    try {
      await axiosInstance.put(`/api/cms/holidays/${editingId}`, {
        year: holidayYear,
        month: parseInt(month, 10),
        day: parseInt(day, 10),
        name: name.trim()
      })
      toast.success('Holiday updated')
      setEditingId(null)
      setEditRow({ month: 0, day: 1, name: '' })
      fetchHolidays()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update holiday')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday?')) return
    setSaving(true)
    try {
      await axiosInstance.delete(`/api/cms/holidays/${id}`)
      toast.success('Holiday deleted')
      if (editingId === id) setEditingId(null)
      fetchHolidays()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete holiday')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (h) => {
    setEditingId(h._id)
    setEditRow({ month: h.month, day: h.day, name: h.name })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Content & Branding</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Update logos, headings, and holiday calendar. Changes apply across the app without code changes.
        </p>

        {/* Branding */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiImage className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Header & Branding</h2>
          </div>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sidebar logo URL</label>
              <input
                type="url"
                value={form.sidebarLogoUrl}
                onChange={(e) => setForm((f) => ({ ...f, sidebarLogoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to use default logo.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App name</label>
              <input
                type="text"
                value={form.appName}
                onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
                placeholder="Artihcus"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Favicon URL (optional)</label>
              <input
                type="url"
                value={form.faviconUrl}
                onChange={(e) => setForm((f) => ({ ...f, faviconUrl: e.target.value }))}
                placeholder="https://example.com/favicon.ico"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              Save branding
            </button>
          </form>
        </section>

        {/* Holiday Calendar labels */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiType className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holiday Calendar page</h2>
          </div>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page title</label>
              <input
                type="text"
                value={form.holidayCalendarTitle}
                onChange={(e) => setForm((f) => ({ ...f, holidayCalendarTitle: e.target.value }))}
                placeholder="Holiday Calendar"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page subtitle</label>
              <input
                type="text"
                value={form.holidayCalendarSubtitle}
                onChange={(e) => setForm((f) => ({ ...f, holidayCalendarSubtitle: e.target.value }))}
                placeholder="Organization holidays"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              Save labels
            </button>
          </form>
        </section>

        {/* Holidays list */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiCalendar className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holidays by year</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
            <select
              value={holidayYear}
              onChange={(e) => setHolidayYear(parseInt(e.target.value, 10))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() - 1].sort((a, b) => b - a).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {editingId ? (
            <form onSubmit={handleUpdateHoliday} className="flex flex-wrap items-end gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
                <select
                  value={editRow.month}
                  onChange={(e) => setEditRow((r) => ({ ...r, month: parseInt(e.target.value, 10) }))}
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Day</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={editRow.day}
                  onChange={(e) => setEditRow((r) => ({ ...r, day: parseInt(e.target.value, 10) || 1 }))}
                  className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editRow.name}
                  onChange={(e) => setEditRow((r) => ({ ...r, name: e.target.value }))}
                  placeholder="Holiday name"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <button type="submit" disabled={saving} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50">
                Save
              </button>
              <button type="button" onClick={() => { setEditingId(null); setEditRow({ month: 0, day: 1, name: '' }); }} className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm hover:underline">
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddHoliday} className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
                <select
                  value={editRow.month}
                  onChange={(e) => setEditRow((r) => ({ ...r, month: parseInt(e.target.value, 10) }))}
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Day</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={editRow.day}
                  onChange={(e) => setEditRow((r) => ({ ...r, day: parseInt(e.target.value, 10) || 1 }))}
                  className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editRow.name}
                  onChange={(e) => setEditRow((r) => ({ ...r, name: e.target.value }))}
                  placeholder="Holiday name"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <button type="submit" disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50">
                <FiPlus className="w-4 h-4" />
                Add
              </button>
            </form>
          )}

          {holidaysLoading ? (
            <LoadingSpinner />
          ) : (
            <ul className="space-y-2">
              {holidays.length === 0 ? (
                <li className="text-sm text-gray-500 dark:text-gray-400 py-4">No holidays for {holidayYear}. Add one above.</li>
              ) : (
                holidays.map((h) => (
                  <li
                    key={h._id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 text-gray-900 dark:text-gray-100"
                  >
                    <span className="text-sm font-medium">{h.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {MONTHS[h.month]} {h.day}, {holidayYear}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(h)}
                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded"
                        title="Edit"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(h._id)}
                        disabled={saving}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default CMS
