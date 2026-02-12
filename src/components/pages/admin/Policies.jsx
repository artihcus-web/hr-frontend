import React, { useState, useEffect } from 'react'
import { FiFileText, FiUpload, FiDownload, FiTrash2, FiX, FiPlus, FiFile, FiEye } from 'react-icons/fi'
import axiosInstance from '../../../utils/axiosInstance'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../common/LoadingSpinner'
import { useAuth } from '../../../context/AuthContext'

const Policies = () => {
    const { user } = useAuth()
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(false)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [previewDocument, setPreviewDocument] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [loadingPreview, setLoadingPreview] = useState(false)
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        file: null
    })

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

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Only PDF files are allowed')
            e.target.value = ''
            return
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            toast.error('File size must be less than 10MB')
            e.target.value = ''
            return
        }

        setFormData(prev => ({ ...prev, file }))
    }

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                // Remove data:application/pdf;base64, prefix
                const base64String = reader.result.split(',')[1]
                resolve(base64String)
            }
            reader.onerror = error => reject(error)
        })
    }

    const handleUpload = async (e) => {
        e.preventDefault()
        
        if (!formData.title.trim() || !formData.description.trim() || !formData.file) {
            toast.error('All fields are required')
            return
        }

        try {
            setUploading(true)
            
            // Convert file to base64
            const fileData = await convertFileToBase64(formData.file)

            await axiosInstance.post('/api/policies', {
                title: formData.title.trim(),
                description: formData.description.trim(),
                fileName: formData.file.name,
                fileData,
                fileSize: formData.file.size
            })

            toast.success('Policy document uploaded successfully')
            setShowUploadModal(false)
            setFormData({ title: '', description: '', file: null })
            fetchDocuments()
        } catch (error) {
            console.error('Error uploading document:', error)
            toast.error(error.response?.data?.message || 'Failed to upload document')
        } finally {
            setUploading(false)
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

    const handleDelete = async (documentId, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
            return
        }

        try {
            await axiosInstance.delete(`/api/policies/${documentId}`)
            toast.success('Policy document deleted successfully')
            fetchDocuments()
        } catch (error) {
            console.error('Error deleting document:', error)
            toast.error('Failed to delete document')
        }
    }

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiFileText className="text-indigo-600 dark:text-indigo-400" />
                        Policy Documents
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and upload company policy documents</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                        <FiPlus className="w-5 h-5" />
                        Upload Policy
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <FiFileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No policy documents</h3>
                    <p className="text-gray-500 dark:text-gray-400">Upload your first policy document to get started.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {documents.map((doc) => (
                        <div key={doc._id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                        <FiFile className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                            {doc.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-line">
                                            {doc.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <FiFileText className="w-3 h-3" />
                                                {doc.fileName}
                                            </span>
                                            <span>{formatFileSize(doc.fileSize)}</span>
                                            <span>Uploaded by {doc.uploadedBy?.fullName || 'Unknown'}</span>
                                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleView(doc._id, doc.fileName)}
                                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                        title="View"
                                    >
                                        <FiEye className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDownload(doc._id, doc.fileName)}
                                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        <FiDownload className="w-5 h-5" />
                                    </button>
                                    {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                        <button
                                            onClick={() => handleDelete(doc._id, doc.title)}
                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <FiTrash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload Policy Document</h2>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false)
                                    setFormData({ title: '', description: '', file: null })
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Policy Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., Employee Code of Conduct"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    placeholder="Write a description about this policy document..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    PDF Document <span className="text-red-500">*</span>
                                    <span className="text-xs text-gray-500 ml-2">(Max 10MB)</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="file-upload"
                                        required
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        <FiUpload className="w-8 h-8 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {formData.file ? formData.file.name : 'Click to upload PDF file'}
                                        </span>
                                        {formData.file && (
                                            <span className="text-xs text-gray-500">
                                                {formatFileSize(formData.file.size)}
                                            </span>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadModal(false)
                                        setFormData({ title: '', description: '', file: null })
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !formData.title || !formData.description || !formData.file}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <LoadingSpinner size="sm" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <FiUpload className="w-4 h-4" />
                                            Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
