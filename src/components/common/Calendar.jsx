import React, { useState, useMemo } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const Calendar = ({ selectedDate, onDateSelect, className = '', view = 'month' }) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  // Helper to generate days for a specific month
  const generateMonthDays = (year, month) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Padding for start of month
    let firstDayIndex = firstDay.getDay() - 1
    if (firstDayIndex === -1) firstDayIndex = 6

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  // --- Year View Rendering ---
  const renderYearView = () => {
    const year = currentDate.getFullYear()

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        {monthNames.map((name, index) => {
          const days = generateMonthDays(year, index)
          return (
            <div key={name} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-100 dark:border-gray-700 transition-colors">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 text-center">{name}</h4>
              <div className="grid grid-cols-7 gap-0.5">
                {dayNames.map(d => (
                  <span key={d} className="text-[8px] text-gray-400 dark:text-gray-500 text-center uppercase">{d}</span>
                ))}
                {days.map((date, i) => (
                  <div key={i} className="aspect-square flex items-center justify-center">
                    {date && (
                      <span className={`text-[8px] w-full h-full flex items-center justify-center rounded-sm transition-colors
                         ${isToday(date) ? 'bg-teal-500 text-white font-bold' : 'text-gray-600 dark:text-gray-400'}
                       `}>
                        {date.getDate()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- Logic for Month View ---
  const calendarDays = useMemo(() => {
    if (view === 'year') return []
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const days = []

    let firstDayIndex = firstDayOfMonth.getDay() - 1
    if (firstDayIndex === -1) firstDayIndex = 6

    const prevMonthLastDay = new Date(year, month, 0)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay.getDate() - i)
      days.push({ date: d, isCurrentMonth: false })
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i)
      days.push({ date: d, isCurrentMonth: true })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d, isCurrentMonth: false })
    }

    return days
  }, [currentDate, view])

  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleDateClick = (date) => {
    if (onDateSelect) {
      onDateSelect(date)
    }
  }

  const isSelectedDate = (date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const isToday = (date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const fullDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors">
          {view === 'year'
            ? `${currentDate.getFullYear()}`
            : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={goToPrevious}
            className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 bg-teal-500 border border-teal-500 rounded hover:bg-teal-600 transition-colors"
          >
            <FiChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {view === 'year' ? (
        renderYearView()
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {fullDayNames.map((day) => (
              <div key={day} className="text-center text-xs py-1 font-medium text-gray-600 dark:text-gray-400 transition-colors">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayObj, index) => {
              const { date, isCurrentMonth } = dayObj
              const selected = isSelectedDate(date)
              const today = isToday(date)

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`
                    aspect-square flex items-center justify-center text-sm font-medium rounded transition-colors
                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-700' : ''}
                    ${selected ? 'bg-teal-500 text-white' : today ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold' : isCurrentMonth ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default Calendar
