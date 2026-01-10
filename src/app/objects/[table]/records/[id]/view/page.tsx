/**
  * @fileoverview Record View Page
  *
  * Provides read-only view for a single record in a selected table
  * within the Supabase `system` schema.
  *
  * Uses the same layout as the edit page but with all fields displayed
  * as read-only, non-editable content.
  */

"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { SmartForeignKeyReference } from '@/components/ui/smart-foreign-key-reference'

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

export default function ViewRecordPage() {
  const params = useParams()
  const tableName = params.table as string
  const recordId = params.id as string
  const [record, setRecord] = useState<any>({})
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [foreignKeys, setForeignKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (tableName && recordId) {
      fetchTableData()
    }
  }, [tableName, recordId])

  // Fetch foreign key information
  useEffect(() => {
    if (tableName && columns.length > 0) {
      const allForeignKeys: any[] = []

      columns.forEach((col: any) => {
        if (col.data_type === 'uuid' && col.column_name !== 'id') {
          if (col.column_name.endsWith('_id')) {
            const baseName = col.column_name.replace('_id', '')

            const tableMap: { [key: string]: string } = {
              'org': 'organizations',
              'organization': 'organizations',
              'profile': 'profiles',
              'user': 'users',
              'role': 'roles',
              'owner_user': 'users',
              'created_by_user': 'users',
              'parent_role': 'roles',
              'createdby': 'users',
              'lastmodifiedby': 'users',
              'owner': 'users',
              'permission': 'permissions'
            }

            if (tableMap[baseName]) {
              allForeignKeys.push({
                column_name: col.column_name,
                foreign_table_name: `system.${tableMap[baseName]}`,
                foreign_column_name: 'id'
              })
            }
          }
        }
      })

      setForeignKeys(allForeignKeys)
    }
  }, [tableName, columns])

  const fetchTableData = async () => {
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
      const supabaseAny = supabase as any
      const { data, error: recError } = await supabaseAny
        .schema('system')
        .from(tableName)
        .select('*')
        .eq(pkColumn.column_name, recordId)
        .single()

      if (recError) {
        throw new Error(recError.message)
      }

      setRecord(data || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const renderFieldValue = (columnName: string, value: any) => {
    const column = columns.find(c => c.column_name === columnName)

    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">NULL</span>
    }

    // Boolean fields - show as disabled checkbox
    if (column?.data_type === 'boolean') {
      return (
        <Checkbox
          checked={Boolean(value)}
          disabled
          className="pointer-events-none"
        />
      )
    }

    // UUID fields that are foreign keys - show with SmartForeignKeyReference
    if (column?.data_type === 'uuid' && columnName !== 'id') {
      const foreignKey = foreignKeys.find(fk => fk.column_name === columnName)
      if (foreignKey) {
        return (
          <SmartForeignKeyReference
            value={value}
            referenceTable={foreignKey.foreign_table_name}
            mode="view"
          />
        )
      }
    }

    // JSON/Object values - show formatted
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="text-gray-700 font-mono text-sm bg-gray-50 p-2 rounded border">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    // Timestamp values - format nicely
    if (column?.data_type?.includes('timestamp') && value) {
      try {
        const date = new Date(value)
        return <span className="text-gray-700">{date.toLocaleString()}</span>
      } catch {
        return <span className="text-gray-700">{String(value)}</span>
      }
    }

    // Default: show as text
    return <span className="text-gray-700">{String(value)}</span>
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
            onClick={fetchTableData}
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
          View Record
        </h1>
        <p className="text-gray-600 mt-2">
          Table: {tableName} | ID: {recordId}
        </p>
      </div>

      {/* Record Details */}
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
                  {column.is_nullable === 'NO' && ' | Required'}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="py-2">
                  {renderFieldValue(column.column_name, record[column.column_name])}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Edit button */}
      <div className="fixed bottom-6 right-6">
        <Link
          href={`/objects/${tableName}/records/${recordId}/edit`}
          className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 border border-teal-600 rounded transition-colors shadow-lg"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Link>
      </div>
    </div>
  )
}
