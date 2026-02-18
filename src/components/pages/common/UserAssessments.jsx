import React from 'react'
import { FiClipboard, FiExternalLink } from 'react-icons/fi'

const ASSESSMENTS_URL = 'https://assessments.artihcus.com'

const UserAssessments = () => {
  const handleTakeAssessment = () => {
    window.open(ASSESSMENTS_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
              <FiClipboard className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Assessments
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Take your assessments to evaluate your knowledge and skills. Click the button below to proceed to the assessment portal.
          </p>
          <button
            onClick={handleTakeAssessment}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <FiExternalLink className="w-5 h-5" />
            Take Assessment
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
            You will be redirected to assessments.artihcus.com
          </p>
        </div>
      </div>
    </div>
  )
}

export default UserAssessments
