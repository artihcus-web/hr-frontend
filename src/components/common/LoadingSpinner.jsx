import React from 'react'
import { FiLoader } from 'react-icons/fi'

const LoadingSpinner = ({ className = "h-8 w-8", color = "text-orange-500 dark:text-orange-400", fullScreen = false }) => {
    if (fullScreen) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center dark:bg-gray-950 transition-colors">
                <FiLoader className={`${className} animate-spin ${color}`} />
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center p-4 transition-colors">
            <FiLoader className={`${className} animate-spin ${color}`} />
        </div>
    )
}

export default LoadingSpinner
