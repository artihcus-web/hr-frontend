import React from 'react'
import { motion as Motion } from 'framer-motion'
import { FiCheck, FiX, FiClock, FiUser, FiCalendar, FiFileText } from 'react-icons/fi'

/**
 * Reusable Approval Card Component
 * 
 * @param {Object} props
 * @param {string} props.title - Main title (e.g., Employee Name)
 * @param {string} props.subtitle - Subtitle (e.g., Project Name, Department)
 * @param {string} props.date - Date or Month of the request
 * @param {string} props.type - Type of request (Timesheet, Leave, Expense)
 * @param {Object} props.details - Key-value pairs of details to display
 * @param {Function} props.onApprove - Callback for approve action
 * @param {Function} props.onReject - Callback for reject action
 * @param {boolean} props.isProcessing - Loading state for actions
 */
const ApprovalCard = ({
    title,
    subtitle,
    date,
    type = 'Request',
    details = {},
    onApprove,
    onReject,
    isProcessing = false
}) => {

    const getIcon = () => {
        switch (type.toLowerCase()) {
            case 'timesheet': return <FiClock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            case 'leave': return <FiCalendar className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            case 'expense': return <FiFileText className="w-5 h-5 text-green-500 dark:text-green-400" />
            default: return <FiFileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        }
    }

    const getStatusColor = () => {
        switch (type.toLowerCase()) {
            case 'timesheet': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
            case 'leave': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'
            case 'expense': return 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
            default: return 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
        }
    }

    return (
        <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-900`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusColor()}`}>
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{subtitle}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                        Pending Review
                    </span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{date}</p>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm">
                {Object.entries(details).map(([key, value]) => (
                    <div key={key}>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider">{key}</span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">{value}</span>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                    onClick={onReject}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                    {isProcessing ? (
                        <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <FiX className="w-4 h-4" />
                            <span>Reject</span>
                        </>
                    )}
                </button>
                <button
                    onClick={onApprove}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                    {isProcessing ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <FiCheck className="w-4 h-4" />
                            <span>Approve</span>
                        </>
                    )}
                </button>
            </div>
        </Motion.div>
    )
}

export default ApprovalCard
