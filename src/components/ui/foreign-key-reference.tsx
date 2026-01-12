/**
 * @fileoverview Foreign Key Reference Display Component
 * 
 * This component provides a reusable UI element for displaying and selecting
 * foreign key references in the Raw System. It supports:
 * - Display mode for showing resolved foreign key values
 * - Edit mode with search functionality for selecting references
 * - Automatic data fetching and caching
 * - Error handling and loading states
 * - Integration with Supabase for real-time data
 * 
 * Used throughout the application for consistent foreign key UI patterns
 * in forms, tables, and detail views.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from './badge'
import { Button } from './button'
import { Search, ExternalLink } from 'lucide-react'
import { ForeignKeyRecord } from '@/types/foreign-key'
import Link from 'next/link'

interface ForeignKeyReferenceProps {
  value: string | null
  referenceTable: string
  referenceField: string
  displayField: string
  mode?: 'view' | 'edit'
  onValueChange?: (value: string | null) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function ForeignKeyReference({
  value,
  referenceTable,
  referenceField,
  displayField,
  mode = 'view',
  onValueChange,
  className = '',
  placeholder = 'Select a record',
  disabled = false
}: ForeignKeyReferenceProps) {
  const [displayValue, setDisplayValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<ForeignKeyRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const supabase = createClient()

  // Fetch display value when UUID changes
  useEffect(() => {
    if (!value) {
      setDisplayValue('')
      return
    }

    const fetchDisplayValue = async () => {
      setIsLoading(true)
      setError(null)

      // Parse reference table to extract schema and table name
      const [schema, tableName] = referenceTable.includes('.')
        ? referenceTable.split('.')
        : ['system', referenceTable]

      try {
        // For business schema, use the special API endpoint
        if (schema === 'business') {
          const response = await fetch(`/api/business/records?table=${tableName}&limit=1000`)
          if (response.ok) {
            const data = await response.json()
            const records = data.records || []
            const record = records.find((r: any) => r.id === value)
            setDisplayValue(record?.[displayField] || '')
          } else {
            throw new Error('Failed to fetch business records')
          }
        } else {
          const { data, error } = await supabase
            .schema(schema)
            .from(tableName)
            .select(displayField)
            .eq(referenceField, value)
            .single()

          if (error) {
            console.error('Supabase query error:', error)
            throw new Error(`Supabase error: ${error.message}`)
          }

          setDisplayValue((data as any)?.[displayField] || '')
        }
      } catch (err) {
        console.error('Error fetching reference:', err)
        setError('Failed to load reference')
        setDisplayValue('')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDisplayValue()
  }, [value, referenceTable, referenceField, displayField, supabase])

  // Search for records
  const searchRecords = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    // Parse reference table to extract schema and table name
    const [schema, tableName] = referenceTable.includes('.')
      ? referenceTable.split('.')
      : ['system', referenceTable]

    try {
      // For business schema, use the special API endpoint
      if (schema === 'business') {
        const response = await fetch(`/api/business/records?table=${tableName}&limit=1000`)
        if (response.ok) {
          const data = await response.json()
          const records = data.records || []
          // Filter by display field containing the query
          const filtered = records.filter((r: any) =>
            r[displayField]?.toLowerCase().includes(query.toLowerCase())
          )
          setSearchResults(filtered.slice(0, 10) as unknown as ForeignKeyRecord[])
        } else {
          throw new Error('Failed to search business records')
        }
      } else {
        const { data, error } = await supabase
          .schema(schema)
          .from(tableName)
          .select(`${referenceField}, ${displayField}`)
          .ilike(displayField, `%${query}%`)
          .limit(10)

        if (error) throw error

        setSearchResults((data as unknown as ForeignKeyRecord[]) || [])
      }
    } catch (err) {
      console.error('Error searching:', err)
      setError('Failed to search')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRecords(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Handle record selection
  const handleSelectRecord = (record: { id: string; [key: string]: any }) => {
    const newValue = record[referenceField]
    setDisplayValue(record[displayField])
    onValueChange?.(newValue)
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Handle clear
  const handleClear = () => {
    setDisplayValue('')
    onValueChange?.(null)
  }

  if (mode === 'view') {
    // Parse reference table to extract schema and table name
    const [schema, tableName] = referenceTable.includes('.')
      ? referenceTable.split('.')
      : ['system', referenceTable]

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isLoading ? (
          <Badge variant="outline" className="animate-pulse">
            Loading...
          </Badge>
        ) : error ? (
          <Badge variant="destructive">
            Error
          </Badge>
        ) : displayValue ? (
          <Link
            href={`/objects/${schema}/${tableName}/records/${value}/view`}
            className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
            title={`View ${displayValue}`}
          >
            {displayValue}
          </Link>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            No reference
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Display current value */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {displayValue ? (
            <Badge variant="secondary" className="max-w-full">
              <span className="truncate">{displayValue}</span>
            </Badge>
          ) : (
            <div className="text-sm text-muted-foreground">
              {placeholder}
            </div>
          )}
        </div>
        
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            disabled={disabled}
          >
            <Search className="h-4 w-4" />
          </Button>
          
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Search dropdown */}
      {showSearch && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder={`Search ${referenceTable}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">
                {error}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              <div className="py-1">
                {searchResults.map((record) => (
                  <button
                    key={record[referenceField]}
                    type="button"
                    onClick={() => handleSelectRecord(record)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <div className="font-medium">{record[displayField]}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {record[referenceField]}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
