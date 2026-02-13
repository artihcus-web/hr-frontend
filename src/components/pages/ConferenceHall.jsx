import React, { useState, useEffect } from 'react'
import { FiCalendar, FiClock, FiUsers, FiFileText, FiPlus, FiX, FiVideo } from 'react-icons/fi'
import axiosInstance from '../../utils/axiosInstance'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

const ConferenceHall = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  
  // Booking form state
  const [formData, setFormData] = useState({
    teamName: '',
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: ''
  })

  // Get today and tomorrow dates
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const res = await axiosInstance.get('/api/conference-hall/bookings')
      setBookings(res.data.bookings || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      // If endpoint doesn't exist yet, use empty array
      if (error.response?.status !== 404) {
        toast.error('Failed to load bookings')
      }
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.teamName || !formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time')
      return
    }

    try {
      setLoading(true)
      await axiosInstance.post('/api/conference-hall/bookings', formData)
      toast.success('Conference hall booked successfully!')
      setFormData({
        teamName: '',
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: ''
      })
      setShowBookingForm(false)
      fetchBookings()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book conference hall')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getBookingsForDate = (dateStr) => {
    return bookings.filter(booking => booking.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const isTimeSlotBooked = (dateStr, time) => {
    return bookings.some(booking => 
      booking.date === dateStr && 
      booking.startTime <= time && 
      booking.endTime > time
    )
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeStr)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const todayBookings = getBookingsForDate(todayStr)
  const tomorrowBookings = getBookingsForDate(tomorrowStr)

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 font-sans transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FiVideo className="w-6 h-6" />
              Conference Hall
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Book and manage conference room reservations
            </p>
          </div>
          <button
            onClick={() => setShowBookingForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            Book Conference Hall
          </button>
        </div>

        {loading && <LoadingSpinner />}

        {/* Booking Form Modal */}
        {showBookingForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Book Conference Hall
                </h2>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="teamName"
                    value={formData.teamName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter team name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter meeting title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter meeting description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      min={todayStr}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Availability View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Availability */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-900/20">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FiCalendar className="w-5 h-5" />
                Today ({formatDate(todayStr)})
              </h2>
            </div>
            <div className="p-6">
              {todayBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FiClock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No bookings for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.map((booking, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {booking.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <FiUsers className="w-4 h-4" />
                            {booking.teamName}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <FiClock className="w-4 h-4" />
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </div>
                        </div>
                      </div>
                      {booking.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {booking.description}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                        Booked by: {booking.bookedBy?.fullName || booking.bookedBy?.username || 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tomorrow's Availability */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-900/20">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FiCalendar className="w-5 h-5" />
                Tomorrow ({formatDate(tomorrowStr)})
              </h2>
            </div>
            <div className="p-6">
              {tomorrowBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FiClock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No bookings for tomorrow</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tomorrowBookings.map((booking, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {booking.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <FiUsers className="w-4 h-4" />
                            {booking.teamName}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <FiClock className="w-4 h-4" />
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </div>
                        </div>
                      </div>
                      {booking.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {booking.description}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                        Booked by: {booking.bookedBy?.fullName || booking.bookedBy?.username || 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConferenceHall
