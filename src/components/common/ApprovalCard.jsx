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
            case 'timesheet': return <FiClock className="w-5 h-5 text-blue-500" />
            case 'leave': return <FiCalendar className="w-5 h-5 text-orange-500" />
            case 'expense': return <FiFileText className="w-5 h-5 text-green-500" />
            default: return <FiFileText className="w-5 h-5 text-gray-500" />
        }
    }

    const getStatusColor = () => {
        switch (type.toLowerCase()) {
            case 'timesheet': return 'bg-blue-50 border-blue-100'
            case 'leave': return 'bg-orange-50 border-orange-100'
            case 'expense': return 'bg-green-50 border-green-100'
            default: return 'bg-gray-50 border-gray-100'
        }
    }

    return (
        <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 bg-white`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusColor()}`}>
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
                        <p className="text-gray-500 text-sm font-medium">{subtitle}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending Review
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{date}</p>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 bg-gray-50 p-3 rounded-lg text-sm">
                {Object.entries(details).map(([key, value]) => (
                    <div key={key}>
                        <span className="text-gray-500 block text-xs uppercase tracking-wider">{key}</span>
                        <span className="font-medium text-gray-700">{value}</span>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2 border-t border-gray-100">
                <button
                    onClick={onReject}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
