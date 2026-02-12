import { useParams } from 'react-router-dom'
import FormSchemaEditor from './components/FormSchemaEditor'
import { useState, useEffect } from 'react'

const DynamicFormSchema = () => {
  const { formType } = useParams()
  const [formName, setFormName] = useState('')

  useEffect(() => {
    // Fetch form type details to get the name
    const saved = localStorage.getItem('formTypes')
    if (saved) {
      const formTypes = JSON.parse(saved)
      const found = formTypes.find(t => t.slug === formType)
      if (found) {
        setFormName(found.name)
      } else {
        setFormName(formType.charAt(0).toUpperCase() + formType.slice(1).replace(/-/g, ' '))
      }
    } else {
      setFormName(formType.charAt(0).toUpperCase() + formType.slice(1).replace(/-/g, ' '))
    }
  }, [formType])

  return <FormSchemaEditor formType={formType} formName={formName} />
}

export default DynamicFormSchema
