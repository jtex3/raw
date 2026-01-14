/**
  * @fileoverview Inline Foreign Key Editor
  *
  * Provides an inline dropdown/search UI for selecting a foreign-key UUID.
  * Used in the record editor page to choose related records.
  *
  * Implementation notes:
  * - Fetches the current display value by ID
  * - Performs `ilike` search against a best-guess display field
  */

"use client"

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InlineForeignKeyEditorProps {
  value: string | null
  referenceTable: string
  columnName: string
  onValueChange: (newValue: string | null) => void
}

export default function InlineForeignKeyEditor({
  value,
  referenceTable,
  columnName,
  onValueChange
}: InlineForeignKeyEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDisplayValue, setCurrentDisplayValue] = useState<string>('')
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle click outside and Escape key to close dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Determine display field based on table name
  const getDisplayField = (tableName: string) => {
    const tableMap: { [key: string]: string } = {
      'system.organizations': 'org_name',
      'system.profiles': 'profile_name',
      'system.roles': 'role_name',
      'system.users': 'email',
      'system.permissions': 'permission_name',
      'business.entity': 'name',
      'business.entity_junction': 'name'
    }
    return tableMap[tableName] || 'name'
  }

  // Extract schema and table name from full reference table
  const getSchemaAndTable = (fullTableName: string) => {
    if (fullTableName.includes('.')) {
      const [schema, table] = fullTableName.split('.')
      return { schema, table }
    }
    return { schema: 'system', table: fullTableName }
  }

  const { schema: referenceSchema, table: tableName } = getSchemaAndTable(referenceTable)
  const displayField = getDisplayField(referenceTable)

  // Fetch current display value
  useEffect(() => {
    if (value && tableName) {
      const fetchDisplayValue = async () => {
        try {
          // Use unified API endpoint for all schemas
          const response = await fetch(`/api/records/${referenceSchema}/${tableName}?limit=1000`)
          if (response.ok) {
            const data = await response.json()
            const records = data.records || []
            const record = records.find((r: any) => r.id === value)
            setCurrentDisplayValue(record?.[displayField] || value)
          } else {
            setCurrentDisplayValue(value)
          }
        } catch (error) {
          console.error('Error fetching display value:', error)
          setCurrentDisplayValue(value)
        }
      }

      fetchDisplayValue()
    }
  }, [value, tableName, displayField, referenceSchema])

  // Search for records
  const handleSearch = async (query: string) => {
    if (!query) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      // Use unified API endpoint for all schemas
      const response = await fetch(`/api/records/${referenceSchema}/${tableName}?limit=1000`)
      if (response.ok) {
        const data = await response.json()
        const records = data.records || []
        // Filter by display field containing the query
        const filtered = records.filter((r: any) =>
          r[displayField]?.toLowerCase().includes(query.toLowerCase())
        )
        setSearchResults(filtered.slice(0, 10))
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // Handle selection
  const handleSelect = (record: any) => {
    onValueChange(record.id)
    setIsOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Handle clear
  const handleClear = () => {
    onValueChange(null)
    setCurrentDisplayValue('')
    setSearchQuery('')
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Current value display / trigger */}
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer flex items-center justify-between bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-teal-600 font-medium' : 'text-gray-500'}>
          {value ? currentDisplayValue : `Select ${columnName.replace('_id', '')}...`}
        </span>
        <div className="flex items-center space-x-2">
          {value && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value
                setSearchQuery(query)
                handleSearch(query)
              }}
              placeholder={`Search ${referenceTable.replace('system.', '')}...`}
              className="w-full pl-10 pr-4 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Search Results */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : searchResults.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchQuery ? 'No results found' : 'Type to search'}
              </div>
            ) : (
              searchResults.map((record) => (
                <div
                  key={record.id}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                  onClick={() => handleSelect(record)}
                >
                  <div className="font-medium">{record[displayField]}</div>
                  <div className="text-gray-500 text-xs">{record.id}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
