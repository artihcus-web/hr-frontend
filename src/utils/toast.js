/**
 * App-wide toast wrapper. Uses a stable id per (type, message) so the same
 * message reuses one toast (updates in place) instead of stacking.
 */
import lib from 'react-hot-toast'

function hash(str) {
  if (typeof str !== 'string') str = String(str)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function stableId(type, message, options) {
  if (options?.id) return options.id
  const msg = typeof message === 'string' ? message : JSON.stringify(message)
  return `${type}-${hash(msg)}`
}

let lastToastId = null

const toast = {
  success: (message, options = {}) => {
    const id = stableId('s', message, options)
    const isUpdate = id === lastToastId
    lastToastId = id
    return lib.success(message, {
      ...options,
      id,
      ...(isUpdate && { className: 'toast-pulse' }),
    })
  },
  error: (message, options = {}) => {
    const id = stableId('e', message, options)
    const isUpdate = id === lastToastId
    lastToastId = id
    return lib.error(message, {
      ...options,
      id,
      ...(isUpdate && { className: 'toast-pulse' }),
    })
  },
  // Pass-through for any other toast API used in the app
  loading: (message, options) => lib.loading(message, options),
  dismiss: (id) => lib.dismiss(id),
  custom: (content, options) => lib.custom(content, options),
  promise: (promise, msgs, options) => lib.promise(promise, msgs, options),
}

export default toast
export { toast }
