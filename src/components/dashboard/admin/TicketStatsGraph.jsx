import React, { useEffect, useState } from 'react'
import { FiTrendingUp, FiAlertCircle } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import LoadingSpinner from '../../common/LoadingSpinner'

const TicketStatsGraph = () => {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axiosInstance.get('/api/grievance/admin/stats')
                setStats(res.data.stats)
            } catch (error) {
                console.error('Failed to fetch ticket stats', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 h-full flex items-center justify-center min-h-[300px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!stats || !stats.trend || stats.trend.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 h-full flex flex-col items-center justify-center min-h-[300px] text-slate-400">
                <FiAlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>No data available</p>
            </div>
        )
    }

    // Chart Dimensions
    const height = 200
    const width = 500
    const padding = 30

    // Scale Data
    const maxVal = Math.max(...stats.trend.map(d => d.count), 5) // Min cap 5 for scale
    const points = stats.trend.map((d, i) => {
        const x = (i / (stats.trend.length - 1)) * (width - padding * 2) + padding
        const y = height - padding - (d.count / maxVal) * (height - padding * 2)
        return { x, y, val: d.count, label: d.day }
    })

    // Generate Path (Basic Polyline for stability, can use Bezier for smoothing)
    // Using Catmull-Rom like smoothing or simple cubic bezier
    const pathData = points.reduce((acc, point, i, a) => {
        if (i === 0) return `M ${point.x},${point.y}`

        // Simple smoothing: Control points midway
        const prev = a[i - 1]
        const midX = (prev.x + point.x) / 2
        return `${acc} C ${midX},${prev.y} ${midX},${point.y} ${point.x},${point.y}`
    }, '')

    return (
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 h-full transition-colors flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                <FiTrendingUp className="text-indigo-500" />
                Ticket Trends (Last 7 Days)
            </h3>

            <div className="relative flex-1 w-full min-h-[200px]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                        const y = height - padding - tick * (height - padding * 2)
                        return (
                            <g key={tick}>
                                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-slate-700" />
                                <text x={padding - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400">
                                    {Math.round(tick * maxVal)}
                                </text>
                            </g>
                        )
                    })}

                    {/* The Line */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="#6366f1" // Indigo-500
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="drop-shadow-sm"
                    />

                    {/* Data Points */}
                    {points.map((point, i) => (
                        <g key={i} className="group cursor-pointer">
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="white"
                                stroke="#6366f1"
                                strokeWidth="2"
                                className="transition-all duration-300 group-hover:r-6 dark:fill-slate-800"
                            />
                            {/* X Axis Labels */}
                            <text x={point.x} y={height - 10} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">
                                {point.label}
                            </text>

                            {/* Tooltip on Hover (Simple implementation) */}
                            <foreignObject x={point.x - 20} y={point.y - 35} width="40" height="30" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 text-center shadow-lg">
                                    {point.val}
                                </div>
                            </foreignObject>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    )
}

export default TicketStatsGraph
