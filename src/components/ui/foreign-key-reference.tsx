"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from './badge'
import { Button } from './button'
import { Search } from 'lucide-react'
import { ForeignKeyRecord } from '@/types/foreign-key'

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
      
      try {
        const { data, error } = await supabase
          .schema('system')
          .from(referenceTable.replace('system.', ''))
          .select(displayField)
          .eq(referenceField, value)
          .single()
        
        if (error) {
          console.error('Supabase query error:', error)
          throw new Error(`Supabase error: ${error.message}`)
        }
        
        setDisplayValue((data as any)?.[displayField] || '')
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

    try {
      const { data, error } = await supabase
        .from(referenceTable)
        .select(`${referenceField}, ${displayField}`)
        .ilike(displayField, `%${query}%`)
        .limit(10)

      if (error) throw error
      
      setSearchResults((data as unknown as ForeignKeyRecord[]) || [])
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
          <Badge variant="secondary" className="max-w-full">
            <span className="truncate">{displayValue}</span>
          </Badge>
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
