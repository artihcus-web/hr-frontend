import React, { useState, useEffect, useCallback } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useSettings } from '../../context/SettingsContext'
import axiosInstance from '../../utils/axiosInstance'

const HolidayCalendar = () => {
  const { settings } = useSettings()
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()

  const fetchHolidays = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get(`/api/cms/holidays?year=${year}`)
      setHolidays(res.data.holidays || [])
    } catch (error) {
      console.error('Failed to fetch holidays:', error)
      setHolidays([])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + offset)
    setCurrentDate(newDate)
  }

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  const renderCalendarGrid = () => {
    const month = currentDate.getMonth()
    let firstDayIndex = new Date(year, month, 1).getDay()
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    const startDate = new Date(year, month, 1 - firstDayIndex)
    const items = []

    for (let row = 0; row < 6; row++) {
      const weekDate = new Date(startDate)
      weekDate.setDate(startDate.getDate() + (row * 7))
      items.push(
        <div key={`wk-${row}`} className="flex items-center justify-center border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 text-xs font-bold transition-colors">
          W{getWeekNumber(weekDate)}
        </div>
      )

      for (let day = 0; day < 7; day++) {
        const currentDayDate = new Date(weekDate)
        currentDayDate.setDate(weekDate.getDate() + day)
        const isCurrentMonth = currentDayDate.getMonth() === month
        const dateNum = currentDayDate.getDate()
        const isHoliday = isCurrentMonth && holidays.some(h => h.month === month && h.day === dateNum)
        const holidayInfo = isHoliday ? holidays.find(h => h.month === month && h.day === dateNum) : null

        items.push(
          <div
            key={`day-${row}-${day}`}
            className={`
              relative py-3 flex flex-col items-center justify-center transition-all duration-200 min-h-[80px]
              ${!isCurrentMonth ? 'bg-gray-50/20 dark:bg-gray-800/20 text-gray-300 dark:text-gray-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}
              ${isHoliday ? 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50' : ''}
            `}
          >
            <span className={`text-sm ${isHoliday ? 'font-bold' : 'font-medium'}`}>{dateNum}</span>
            {isHoliday && (
              <span className="hidden sm:block text-[10px] text-center bg-white/80 dark:bg-gray-800/90 px-1 rounded mt-1 shadow-sm w-[90%] truncate leading-tight transition-colors">
                {holidayInfo.name}
              </span>
            )}
            {isHoliday && (
              <div className="sm:hidden w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full mt-1" />
            )}
          </div>
        )
      }
    }
    return items
  }

  const title = settings.holidayCalendarTitle || 'Holiday Calendar'
  const subtitle = settings.holidayCalendarSubtitle || 'Organization holidays'

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 font-sans transition-colors">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs">{subtitle} {year}</p>
        </div>

        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10 transition-colors">
            <button type="button" onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-900 transition-colors">
            <div className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 transition-colors">
              <div className="py-3 text-center border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">#</span>
              </div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="py-3 text-center">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{d}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-8 divide-y divide-gray-50 dark:divide-gray-800 transition-colors">
              {loading ? (
                <div className="col-span-8 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">Loading calendar…</div>
              ) : (
                renderCalendarGrid()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HolidayCalendar
