import React, { useEffect, useState } from 'react'
import { FiActivity, FiUser, FiClock, FiAlertCircle } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'

const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

const RecentActivity = () => {
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await axiosInstance.get('/api/activity?limit=3')
                // Ensure logs is an array to prevent crashes
                setActivities(res.data.logs && Array.isArray(res.data.logs) ? res.data.logs : [])
            } catch (err) {
                console.error('Failed to fetch activity logs:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchActivity()
    }, [])

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 h-full flex items-center justify-center min-h-[300px]">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="h-2 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 h-full transition-colors">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FiActivity className="text-indigo-500" />
                    Recent Activity
                </h3>
            </div>

            <div className="flex flex-col gap-3">
                {activities.length === 0 ? (
                    <div className="w-full text-center py-4 text-slate-400 dark:text-slate-500">
                        <FiAlertCircle className="mx-auto h-6 w-6 mb-2 opacity-50" />
                        <p className="text-sm">No recent activity</p>
                    </div>
                ) : (
                    activities.map((log, index) => (
                        <div key={log._id || index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                                    {log.description}
                                </p>
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 mt-2">
                                    <span className="flex items-center gap-1">
                                        <FiUser className="w-3 h-3" />
                                        <span className="truncate max-w-[80px]">{log.user?.fullName || 'User'}</span>
                                    </span>
                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                        <FiClock className="w-3 h-3" />
                                        {log.timestamp ? timeAgo(log.timestamp) : 'Now'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    )
}

export default RecentActivity
