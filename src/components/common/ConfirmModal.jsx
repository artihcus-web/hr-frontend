import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';

const ConfirmModal = ({ isOpen, onClose, title, message, type = 'success', onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md transition-colors">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-transparent dark:border-gray-800">
                <div className="p-6 text-center">
                    <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 transition-colors ${type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                        {type === 'success' ? (
                            <FiCheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        ) : (
                            <FiAlertCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors">{title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium transition-colors">{message}</p>

                    <div className="flex gap-3 justify-center">
                        {onConfirm ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors shadow-lg dark:shadow-none"
                                >
                                    Confirm
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white font-semibold rounded-lg transition-colors shadow-lg dark:shadow-none"
                            >
                                OK, Got it!
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
