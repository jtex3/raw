/**
 * @fileoverview Custom Hook for Foreign Key Data Fetching
 * 
 * This React hook provides functionality for fetching and displaying foreign key
 * reference data in the Raw System. It handles:
 * - Automatic data fetching when foreign key values change
 * - Loading states and error handling
 * - Display value resolution for UUID foreign keys
 * - Supabase client integration with proper error handling
 * 
 * Used throughout the application for displaying human-readable values
 * instead of raw UUID foreign key references.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Configuration options for foreign key data fetching
 */
interface UseForeignKeyOptions {
  referenceTable: string
  referenceField: string
  displayField: string
}

/**
 * Custom hook for fetching and displaying foreign key reference values
 * 
 * This hook automatically fetches the display value for a foreign key UUID reference,
 * handling loading states, error conditions, and caching. It's designed to work with
 * the multi-tenant system's UUID-based foreign key relationships.
 * 
 * @param value - The foreign key UUID value to resolve, or null if no reference
 * @param options - Configuration object specifying the foreign key relationship
 * @param options.referenceTable - The table name containing the referenced record
 * @param options.referenceField - The field name used for matching (typically 'id')
 * @param options.displayField - The field name to display (e.g., 'name', 'email')
 * 
 * @returns {Object} Hook result object containing:
 *   - displayValue: The resolved display text or empty string
 *   - isLoading: Boolean indicating if fetch is in progress
 *   - error: Error message string or null if no error
 * 
 * @example
 * ```typescript
 * const { displayValue, isLoading, error } = useForeignKey(
 *   user.org_id,
 *   {
 *     referenceTable: 'system.organizations',
 *     referenceField: 'id',
 *     displayField: 'org_name'
 *   }
 * )
 * 
 * if (isLoading) return <Spinner />
 * if (error) return <ErrorMessage error={error} />
 * return <span>{displayValue}</span>
 * ```
 */
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
