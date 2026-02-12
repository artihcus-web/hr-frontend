import React, { useState, useEffect } from 'react'
import { FiFileText, FiEye, FiDownload, FiFile, FiStar, FiX } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../common/LoadingSpinner'

const Policies = () => {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(false)
    const [previewDocument, setPreviewDocument] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [hoveredPolicy, setHoveredPolicy] = useState(null)

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            const res = await axiosInstance.get('/api/policies')
            setDocuments(res.data.documents || [])
        } catch (error) {
            console.error('Error fetching documents:', error)
            toast.error('Failed to load policy documents')
        } finally {
            setLoading(false)
        }
    }

    const handleView = async (documentId, fileName) => {
        try {
            setLoadingPreview(true)
            const res = await axiosInstance.get(`/api/policies/${documentId}/download`)
            const { fileData } = res.data

            // Convert base64 to blob
            const byteCharacters = atob(fileData)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'application/pdf' })

            // Create blob URL for preview
            const url = window.URL.createObjectURL(blob)
            setPreviewUrl(url)
            setPreviewDocument({ id: documentId, fileName })
        } catch (error) {
            console.error('Error loading document preview:', error)
            toast.error('Failed to load document preview')
        } finally {
            setLoadingPreview(false)
        }
    }

    const handleClosePreview = () => {
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(null)
        setPreviewDocument(null)
    }

    const handleDownload = async (documentId, fileName) => {
        try {
            const res = await axiosInstance.get(`/api/policies/${documentId}/download`)
            const { fileData } = res.data

            // Convert base64 to blob
            const byteCharacters = atob(fileData)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'application/pdf' })

            // Create download link
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast.success('Document downloaded successfully')
        } catch (error) {
            console.error('Error downloading document:', error)
            toast.error('Failed to download document')
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiFileText className="text-indigo-600 dark:text-indigo-400" />
                    Policies
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">View and download company policy documents</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <FiFileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No policy documents</h3>
                    <p className="text-gray-500 dark:text-gray-400">No policy documents available at the moment.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        S.NO.
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Policy Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Policy Document
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                {documents.map((doc, index) => (
                                    <tr key={doc._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 relative">
                                            <span 
                                                className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                onMouseEnter={() => setHoveredPolicy(doc._id)}
                                                onMouseLeave={() => setHoveredPolicy(null)}
                                            >
                                                {doc.title}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <FiFile className="w-4 h-4 text-red-500" />
                                                    <span className="truncate max-w-xs">{doc.fileName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <button
                                                        onClick={() => handleView(doc._id, doc.fileName)}
                                                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(doc._id, doc.fileName)}
                                                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                        title="Download"
                                                    >
                                                        <FiDownload className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tooltip - Rendered outside table to avoid clipping */}
            {hoveredPolicy && documents.find(d => d._id === hoveredPolicy) && (() => {
                const doc = documents.find(d => d._id === hoveredPolicy)
                if (!doc || !doc.description) return null
                
                return (
                    <div className="fixed z-[100] pointer-events-none" style={{
                        left: `${window.innerWidth / 2 - 160}px`,
                        top: `${window.innerHeight / 2}px`,
                        transform: 'translateY(-50%)'
                    }}>
                        <div className="w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-start gap-2">
                                <FiStar className="w-4 h-4 text-yellow-500 dark:text-yellow-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                    {doc.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Preview Modal */}
            {previewDocument && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-6xl h-[90vh] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FiEye className="w-5 h-5 text-green-600 dark:text-green-400" />
                                {previewDocument.fileName}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(previewDocument.id, previewDocument.fileName)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                                    title="Download"
                                >
                                    <FiDownload className="w-4 h-4" />
                                    Download
                                </button>
                                <button
                                    onClick={handleClosePreview}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden p-4">
                            {loadingPreview ? (
                                <div className="flex items-center justify-center h-full">
                                    <LoadingSpinner />
                                </div>
                            ) : previewUrl ? (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    Failed to load preview
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Policies
