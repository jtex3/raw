"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseForeignKeyOptions {
  referenceTable: string
  referenceField: string
  displayField: string
}

export function useForeignKey(value: string | null, options: UseForeignKeyOptions) {
  const [displayValue, setDisplayValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (!value) {
      setDisplayValue('')
      return
    }

    const fetchDisplayValue = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const { data, error } = await supabase
          .from(options.referenceTable)
          .select(options.displayField)
          .eq(options.referenceField, value)
          .single()
        
        if (error) throw error
        
        setDisplayValue((data as any)?.[options.displayField] || '')
      } catch (err) {
        console.error('Error fetching reference:', err)
        setError('Failed to load reference')
        setDisplayValue('')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDisplayValue()
  }, [value, options, supabase])

  return { displayValue, isLoading, error }
}
