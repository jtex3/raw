/**
 * @fileoverview Foreign Key Reference Display Component
 *
 * This component provides a reusable UI element for displaying and selecting
 * foreign key references in the Raw System. It supports:
 * - Display mode for showing resolved foreign key values
 * - Edit mode with search functionality for selecting references
 * - Automatic data fetching via unified API endpoint
 * - Error handling and loading states
 *
 * Used throughout the application for consistent foreign key UI patterns
 * in forms, tables, and detail views.
 */

"use client"

import { useState, useEffect } from 'react'
import { Badge } from './badge'
import { Button } from './button'
import { Search } from 'lucide-react'
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
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Parse reference table to extract schema and table name
  const [schema, tableName] = referenceTable.includes('.')
    ? referenceTable.split('.')
    : ['system', referenceTable]

  // Fetch display value when UUID changes
  useEffect(() => {
    if (!value) {
      setDisplayValue('')
      return
    }

    const fetchDisplayValue = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Use unified API endpoint for all schemas
        const response = await fetch(`/api/records/${schema}/${tableName}?limit=1000`)
        if (response.ok) {
          const data = await response.json()
          const records = data.records || []
          const record = records.find((r: any) => r.id === value)
          setDisplayValue(record?.[displayField] || '')
        } else {
          throw new Error(`Failed to fetch ${schema} records`)
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
  }, [value, schema, tableName, displayField])

  // Search for records
  useEffect(() => {
    const searchRecords = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Use unified API endpoint for all schemas
        const response = await fetch(`/api/records/${schema}/${tableName}?limit=1000`)
        if (response.ok) {
          const data = await response.json()
          const records = data.records || []
          // Filter by display field containing the query
          const filtered = records.filter((r: any) =>
            r[displayField]?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          setSearchResults(filtered.slice(0, 10))
        } else {
          throw new Error(`Failed to search ${schema} records`)
        }
      } catch (err) {
        console.error('Error searching:', err)
        setError('Failed to search')
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      searchRecords()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, schema, tableName, displayField])

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

  // View mode
  if (mode === 'view') {
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

  // Edit mode
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
