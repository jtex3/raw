"use client"

import { useState, useEffect } from 'react'
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

  // Determine display field based on table name
  const getDisplayField = (tableName: string) => {
    const tableMap: { [key: string]: string } = {
      'system.organizations': 'org_name',
      'system.profiles': 'profile_name', 
      'system.roles': 'role_name',
      'system.users': 'email',
      'system.permissions': 'permission_name'
    }
    console.log('Getting display field for table:', tableName)
    const field = tableMap[tableName] || 'name'
    console.log('Display field:', field)
    return field
  }

  // Extract table name without schema prefix
  const getTableName = (fullTableName: string) => {
    if (fullTableName.startsWith('system.')) {
      return fullTableName.replace('system.', '')
    }
    return fullTableName
  }

  const tableName = getTableName(referenceTable)
  const displayField = getDisplayField(referenceTable)

  // Fetch current display value
  useEffect(() => {
    if (value && tableName) {
      const fetchDisplayValue = async () => {
        console.log('Fetching display value for:', { value, tableName, displayField })
        
        try {
          const { data, error } = await supabase
            .schema('system')
            .from(tableName)
            .select(displayField)
            .eq('id', value)
            .single()

          console.log('Display value query result:', { data, error })

          if (error) {
            console.error('Error fetching display value:', error)
            setCurrentDisplayValue(value)
          } else {
            setCurrentDisplayValue(data?.[displayField] || value)
          }
        } catch (error) {
          console.error('Error fetching display value:', error)
          setCurrentDisplayValue(value)
        }
      }

      fetchDisplayValue()
    }
  }, [value, tableName, displayField])

  // Search for records
  const handleSearch = async (query: string) => {
    console.log('Searching for:', query, 'in table:', tableName, 'using field:', displayField)
    
    if (!query) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .schema('system')
        .from(tableName)
        .select(`id, ${displayField}`)
        .ilike(displayField, `%${query}%`)
        .limit(10)

      console.log('Search result:', { data, error })

      if (error) {
        console.error('Error searching:', error)
        setSearchResults([])
      } else {
        setSearchResults(data || [])
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
    <div className="relative">
      {/* Current value display / trigger */}
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer flex items-center justify-between bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
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
