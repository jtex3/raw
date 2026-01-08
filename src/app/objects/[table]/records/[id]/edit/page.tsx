"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Save, X } from 'lucide-react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

export default function EditRecordPage() {
  const params = useParams()
  const router = useRouter()
  const tableName = params.table as string
  const recordId = params.id as string
  const [record, setRecord] = useState<any>({})
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (tableName && recordId) {
      if (recordId === 'new') {
        // For new records, just fetch columns, don't fetch existing data
        fetchColumnsOnly()
      } else {
        // For existing records, fetch both columns and record data
        fetchRecordAndColumns()
      }
    }
  }, [tableName, recordId])

  const fetchColumnsOnly = async () => {
    try {
      setLoading(true)

      // Get column information only
      const { data: colData, error: colError } = await supabase
        .schema('system')
        .rpc('get_schema_system_tables_columns', { target_table: tableName })

      if (colError) {
        throw new Error(colError.message)
      }

      setColumns(colData || [])
      // For new records, start with empty form data
      setFormData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecordAndColumns = async () => {
    try {
      setLoading(true)

      // Get column information
      const { data: colData, error: colError } = await supabase
        .schema('system')
        .rpc('get_schema_system_tables_columns', { target_table: tableName })

      if (colError) {
        throw new Error(colError.message)
      }

      setColumns(colData || [])

      // Find the primary key column (usually UUID)
      const pkColumn = colData?.find((c: ColumnInfo) => c.data_type === 'uuid') || colData?.[0]
      
      if (!pkColumn) {
        throw new Error('Could not determine primary key column')
      }

      // Fetch the specific record
      const { data, error: recError } = await supabase
        .schema('system')
        .from(tableName)
        .select('*')
        .eq(pkColumn.column_name, recordId)
        .single()

      if (recError) {
        throw new Error(recError.message)
      }

      setRecord(data || {})
      setFormData(data || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (columnName: string, value: string | boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      [columnName]: value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Find the primary key column
      const pkColumn = columns.find(c => c.data_type === 'uuid') || columns[0]
      
      if (!pkColumn) {
        throw new Error('Could not determine primary key column')
      }

      if (recordId === 'new') {
        // Insert new record
        const { error } = await supabase
          .schema('system')
          .from(tableName)
          .insert(formData)

        if (error) {
          throw new Error(error.message)
        }
      } else {
        // Update existing record
        const { error } = await supabase
          .schema('system')
          .from(tableName)
          .update(formData)
          .eq(pkColumn.column_name, recordId)

        if (error) {
          throw new Error(error.message)
        }
      }

      // Redirect back to records page
      router.push(`/objects/${tableName}/records`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record')
      setSaving(false)
    }
  }

  const isEditable = (column: ColumnInfo) => {
    // Don't allow editing of auto-generated fields
    if (column.column_default && (
      column.column_default.includes('gen_random_uuid()') ||
      column.column_default.includes('now()')
    )) {
      return false
    }
    
    // Don't allow editing primary key UUID fields (identified by being the UUID used to fetch the record)
    const pkColumn = columns.find(c => c.data_type === 'uuid')
    if (column.data_type === 'uuid' && pkColumn && column.column_name === pkColumn.column_name) {
      return false
    }
    
    return true
  }

  const renderInput = (column: ColumnInfo) => {
    const value = formData[column.column_name] || ''
    const editable = isEditable(column)
    
    if (!editable) {
      return (
        <input
          type="text"
          value={value}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
          readOnly
        />
      )
    }

    // Render different input types based on data type
    if (column.data_type === 'boolean') {
      return (
        <Checkbox
          id={column.column_name}
          checked={Boolean(value)}
          onCheckedChange={(checked) => handleInputChange(column.column_name, Boolean(checked))}
        />
      )
    }

    if (column.data_type.includes('text') || column.data_type.includes('char')) {
      return (
        <textarea
          value={value}
          onChange={(e) => handleInputChange(column.column_name, e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      )
    }

    // Default to text input for most types
    return (
      <input
        type={column.data_type.includes('timestamp') ? 'datetime-local' : 'text'}
        value={value}
        onChange={(e) => handleInputChange(column.column_name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading record...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchRecordAndColumns}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 relative min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/objects/${tableName}/records`}
          className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {tableName} Records
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {recordId === 'new' ? 'Add Record' : 'Edit Record'}
        </h1>
        <p className="text-gray-600 mt-2">
          Table: {tableName} • {recordId === 'new' ? 'New Record' : `ID: ${recordId}`}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          {columns.map((column) => (
            <div key={column.column_name} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  {column.column_name}
                </label>
                <div className="text-xs text-gray-500">
                  {column.data_type}
                  {column.is_nullable === 'NO' && ' • Required'}
                </div>
              </div>
              <div className="md:col-span-2">
                {renderInput(column)}
                {!isEditable(column) && (
                  <p className="text-xs text-gray-500 mt-1">
                    This field is read-only
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating buttons */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
        <Link
          href={`/objects/${tableName}/records`}
          className="inline-flex items-center px-3 py-1 text-xs font-medium text-teal-600 bg-white hover:bg-gray-50 border border-teal-600 rounded transition-colors shadow-lg"
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 border border-teal-600 rounded transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
