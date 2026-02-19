import React, { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../../context/SettingsContext'
import { getAssetUrl } from '../../../config/apiConfig'
import axiosInstance from '../../../utils/axiosInstance'
import toast from '../../../utils/toast'
import { FiSave, FiCalendar, FiImage, FiType, FiPlus, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import LoadingSpinner from '../../common/LoadingSpinner'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CMS = () => {
  const { settings, refetchSettings, settingsVersion } = useSettings()
  const [activeTab, setActiveTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    sidebarLogoUrl: '',
    appName: '',
    faviconUrl: '',
    holidayCalendarTitle: '',
    holidayCalendarSubtitle: ''
  })
  const [logoFile, setLogoFile] = useState(null)
  const [faviconFile, setFaviconFile] = useState(null)
  const [newLogoPreviewUrl, setNewLogoPreviewUrl] = useState(null)
  const [newFaviconPreviewUrl, setNewFaviconPreviewUrl] = useState(null)
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  useEffect(() => {
    setCurrentDate((d) => new Date(holidayYear, d.getMonth(), 1))
  }, [holidayYear])
  const [holidays, setHolidays] = useState([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState({ year: 0, month: 0, day: 0 })
  const [modalHoliday, setModalHoliday] = useState(null)
  const [modalName, setModalName] = useState('')
  const [modalDescription, setModalDescription] = useState('')

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

  const changeMonth = (offset) => {
    setCurrentDate((d) => new Date(holidayYear, d.getMonth() + offset, 1))
  }

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  const handleSaveBranding = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Use response values for PUT so we don't overwrite newly uploaded URLs with stale form state
      let sidebarLogoUrlToSave = form.sidebarLogoUrl
      let faviconUrlToSave = form.faviconUrl

      if (logoFile) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        const res = await axiosInstance.post('/api/cms/upload/logo', fd, {
          headers: { 'Content-Type': false }
        })
        if (res.data?.settings?.sidebarLogoUrl) {
          sidebarLogoUrlToSave = res.data.settings.sidebarLogoUrl
          setForm((f) => ({ ...f, ...res.data.settings }))
        }
        setLogoFile(null)
      }
      if (faviconFile) {
        const fd = new FormData()
        fd.append('favicon', faviconFile)
        const res = await axiosInstance.post('/api/cms/upload/favicon', fd, {
          headers: { 'Content-Type': false }
        })
        if (res.data?.settings?.faviconUrl) {
          faviconUrlToSave = res.data.settings.faviconUrl
          setForm((f) => ({ ...f, ...res.data.settings }))
        }
        setFaviconFile(null)
      }

      await axiosInstance.put('/api/cms/settings', {
        appName: form.appName,
        sidebarLogoUrl: sidebarLogoUrlToSave,
        faviconUrl: faviconUrlToSave
      })
      await refetchSettings()
      toast.success('Branding saved')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCalendarLabels = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axiosInstance.put('/api/cms/settings', {
        holidayCalendarTitle: form.holidayCalendarTitle,
        holidayCalendarSubtitle: form.holidayCalendarSubtitle
      })
      toast.success('Labels saved')
      refetchSettings()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save labels')
    } finally {
      setSaving(false)
    }
  }

  const openDateModal = (year, month, day) => {
    setModalDate({ year, month, day })
    const existing = holidays.find((h) => h.year === year && h.month === month && h.day === day)
    setModalHoliday(existing || null)
    setModalName(existing?.name || '')
    setModalDescription(existing?.description || '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalHoliday(null)
    setModalName('')
    setModalDescription('')
  }

  const handleSaveHolidayModal = async (e) => {
    e.preventDefault()
    if (!modalName?.trim()) {
      toast.error('Holiday name is required')
      return
    }
    setSaving(true)
    try {
      if (modalHoliday) {
        await axiosInstance.put(`/api/cms/holidays/${modalHoliday._id}`, {
          year: modalDate.year,
          month: modalDate.month,
          day: modalDate.day,
          name: modalName.trim(),
          description: modalDescription.trim()
        })
        toast.success('Holiday updated')
      } else {
        await axiosInstance.post('/api/cms/holidays', {
          year: modalDate.year,
          month: modalDate.month,
          day: modalDate.day,
          name: modalName.trim(),
          description: modalDescription.trim()
        })
        toast.success('Holiday added')
      }
      fetchHolidays()
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save holiday')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHolidayModal = async () => {
    if (!modalHoliday || !window.confirm('Delete this holiday?')) return
    setSaving(true)
    try {
      await axiosInstance.delete(`/api/cms/holidays/${modalHoliday._id}`)
      toast.success('Holiday deleted')
      fetchHolidays()
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete holiday')
    } finally {
      setSaving(false)
    }
  }

  const renderCalendarGrid = () => {
    const month = currentDate.getMonth()
    const year = holidayYear
    let firstDayIndex = new Date(year, month, 1).getDay()
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    const startDate = new Date(year, month, 1 - firstDayIndex)
    const items = []

    for (let row = 0; row < 6; row++) {
      const weekDate = new Date(startDate)
      weekDate.setDate(startDate.getDate() + row * 7)
      items.push(
        <div
          key={`wk-${row}`}
          className="flex items-center justify-center border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 text-xs font-bold"
        >
          W{getWeekNumber(weekDate)}
        </div>
      )

      for (let day = 0; day < 7; day++) {
        const currentDayDate = new Date(weekDate)
        currentDayDate.setDate(weekDate.getDate() + day)
        const isCurrentMonth = currentDayDate.getMonth() === month
        const dateNum = currentDayDate.getDate()
        const cellYear = currentDayDate.getFullYear()
        const isHoliday =
          isCurrentMonth &&
          holidays.some((h) => h.month === month && h.day === dateNum)
        const holidayInfo = isHoliday
          ? holidays.find((h) => h.month === month && h.day === dateNum)
          : null
        const canEdit = cellYear === holidayYear

        items.push(
          <button
            key={`day-${row}-${day}`}
            type="button"
            onClick={() => canEdit && openDateModal(cellYear, month, dateNum)}
            disabled={!canEdit}
            className={`
              relative py-3 flex flex-col items-center justify-center transition-all duration-200 min-h-[80px] text-left
              ${!isCurrentMonth ? 'bg-gray-50/20 dark:bg-gray-800/20 text-gray-300 dark:text-gray-700 cursor-default' : 'text-gray-700 dark:text-gray-300'}
              ${isCurrentMonth && canEdit ? 'hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer' : ''}
              ${isHoliday ? 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50' : ''}
            `}
          >
            <span className={`text-sm ${isHoliday ? 'font-bold' : 'font-medium'}`}>{dateNum}</span>
            {isHoliday && (
              <span className="hidden sm:block text-[10px] text-center bg-white/80 dark:bg-gray-800/90 px-1 rounded mt-1 shadow-sm w-[90%] truncate leading-tight">
                {holidayInfo.name}
              </span>
            )}
            {isHoliday && (
              <div className="sm:hidden w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full mt-1" />
            )}
          </button>
        )
      }
    }
    return items
  }

  // Current logo/favicon from context (same as sidebar); new file selection for preview before save
  const currentLogoUrl = settings.sidebarLogoUrl?.trim()
    ? `${getAssetUrl(settings.sidebarLogoUrl)}?v=${settingsVersion}`
    : null
  const currentFaviconUrl = settings.faviconUrl?.trim()
    ? `${getAssetUrl(settings.faviconUrl)}?v=${settingsVersion}`
    : null
  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile)
      setNewLogoPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setNewLogoPreviewUrl(null)
  }, [logoFile])
  useEffect(() => {
    if (faviconFile) {
      const url = URL.createObjectURL(faviconFile)
      setNewFaviconPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setNewFaviconPreviewUrl(null)
  }, [faviconFile])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Content & Branding</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Update logos, headings, and holiday calendar. Changes apply across the app without code changes.
        </p>

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 0
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Header & Branding
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(1)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 1
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Holiday Calendar
          </button>
        </div>

        {activeTab === 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiImage className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Header & Branding</h2>
            </div>
            <form onSubmit={handleSaveBranding} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sidebar logo</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">PNG or JPEG. Upload only (no URL).</p>
                {currentLogoUrl && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Current logo (shown in sidebar)</span>
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg inline-block">
                      <img src={currentLogoUrl} alt="Current logo" className="h-12 object-contain max-w-[200px]" />
                    </div>
                  </div>
                )}
                {newLogoPreviewUrl && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">New logo (preview)</span>
                    <div className="mt-1 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg inline-block border border-indigo-200 dark:border-indigo-800">
                      <img src={newLogoPreviewUrl} alt="New logo preview" className="h-12 object-contain max-w-[200px]" />
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Favicon</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">SVG only. Upload only (no URL).</p>
                {currentFaviconUrl && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Current favicon</span>
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg inline-block">
                      <img src={currentFaviconUrl} alt="Current favicon" className="h-8 w-8 object-contain" />
                    </div>
                  </div>
                )}
                {newFaviconPreviewUrl && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">New favicon (preview)</span>
                    <div className="mt-1 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg inline-block border border-indigo-200 dark:border-indigo-800">
                      <img src={newFaviconPreviewUrl} alt="New favicon preview" className="h-8 w-8 object-contain" />
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
                />
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
        )}

        {activeTab === 1 && (
          <>
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <FiType className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holiday Calendar page</h2>
              </div>
              <form onSubmit={handleSaveCalendarLabels} className="space-y-4">
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
                  {[new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-400">Click a date to add or edit. Saving holidays for a year publishes it so employees can see that year.</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select year, then add or update holidays. Until you save at least one holiday for a year (e.g. 2027), users will see “Your HR department has not updated this year yet” for that year.</p>

              <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30">
                  <div className="py-3 text-center border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">#</span>
                  </div>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} className="py-3 text-center">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{d}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-8 divide-y divide-gray-50 dark:divide-gray-800">
                  {holidaysLoading ? (
                    <div className="col-span-8 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    renderCalendarGrid()
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {modalHoliday ? 'Edit holiday' : 'Add holiday'} – {modalDate.day} {MONTHS[modalDate.month]} {modalDate.year}
              </h3>
              <button type="button" onClick={closeModal} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveHolidayModal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="Holiday name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <FiSave className="w-4 h-4" />
                  {modalHoliday ? 'Update' : 'Add'}
                </button>
                {modalHoliday && (
                  <button
                    type="button"
                    onClick={handleDeleteHolidayModal}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:underline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CMS
