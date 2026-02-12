import { useParams } from 'react-router-dom'
import FormSchemaEditor from './components/FormSchemaEditor'
import { useState, useEffect } from 'react'

const DynamicFormSchema = () => {
  const { formType } = useParams()
  const [formName, setFormName] = useState('')

  useEffect(() => {
    if (!formType || typeof formType !== 'string') return
    const formattedFallback = formType.charAt(0).toUpperCase() + formType.slice(1).replace(/-/g, ' ')
    try {
      const saved = localStorage.getItem('formTypes')
      if (saved) {
        const formTypes = JSON.parse(saved)
        if (Array.isArray(formTypes)) {
          const found = formTypes.find(t => t.slug === formType)
          if (found) {
            setFormName(found.name)
            return
          }
        }
      }
    } catch {
      // ignore parse failure
    }
    setFormName(formattedFallback)
  }, [formType])

  return <FormSchemaEditor formType={formType} formName={formName} />
}

export default DynamicFormSchema
