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
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Edit, Trash2 } from 'lucide-react'
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
  const router = useRouter()
  const schema = params.schema as string
  const tableName = params.table as string
  const recordId = params.id as string
  const [record, setRecord] = useState<any>({})
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [foreignKeys, setForeignKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canUpdate, setCanUpdate] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (tableName && recordId) {
      fetchTableData()
      fetchPermissions()
    }
  }, [tableName, recordId])

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`/api/schema?schema=${schema}`)
      if (response.ok) {
        const data = await response.json()
        const tablePermissions = data.tables?.find(
          (t: any) => t.table_name === tableName
        )
        if (tablePermissions) {
          setCanUpdate(tablePermissions.can_update === true)
          setCanDelete(tablePermissions.can_delete === true)
        }
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)

      // Find the primary key column
      const pkColumn = columns.find(c => c.data_type === 'uuid') || columns[0]

      if (!pkColumn) {
        throw new Error('Could not determine primary key column')
      }

      // Use soft delete function
      const { error: deleteError } = await supabase
        .schema('recycle')
        .rpc('soft_delete_record', {
          p_schema: schema,
          p_table: tableName,
          p_record_id: recordId
        })

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      // Redirect back to records page
      router.push(`/objects/${schema}/${tableName}/records`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Fetch foreign key information
  useEffect(() => {
    if (tableName && columns.length > 0) {
      const fetchForeignKeys = async () => {
        try {
          const fkResponse = await fetch(`/api/schema/foreign-keys?schema=${schema}&table=${tableName}`)
          if (fkResponse.ok) {
            const fkData = await fkResponse.json()
            const fkList = fkData.foreignKeys || []
            // Format foreign keys for the component
            const formattedFKs = fkList.map((fk: any) => ({
              column_name: fk.column_name,
              foreign_table_name: `${fk.foreign_schema_name}.${fk.foreign_table_name}`,
              foreign_column_name: fk.foreign_column_name
            }))
            setForeignKeys(formattedFKs)
          }
        } catch (fkErr) {
          console.error('Failed to fetch foreign keys:', fkErr)
          setForeignKeys([])
        }
      }
      fetchForeignKeys()
    }
  }, [tableName, columns, schema])

  const fetchTableData = async () => {
    try {
      setLoading(true)

      // Use unified API endpoint for all schemas
      const response = await fetch(`/api/records/${schema}/${tableName}?limit=1000`)
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `Failed to fetch ${schema} record`)
      }

      const data = await response.json()
      const colData = data.columns || []
      const records = data.records || []

      // Get the specific record from the records
      const recData = records.find((r: any) => r.id === recordId) || {}

      if (Object.keys(recData).length === 0) {
        throw new Error('Record not found')
      }

      // Filter out display_name column for entity and entity_junction tables
      const filteredColData = schema === 'business' && (tableName === 'entity' || tableName === 'entity_junction')
        ? colData.filter((c: ColumnInfo) => c.column_name !== 'display_name')
        : colData

      setColumns(filteredColData)
      setRecord(recData)
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
          href={`/objects/${schema}/${tableName}/records`}
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

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
        {canUpdate && (
          <Link
            href={`/objects/${schema}/${tableName}/records/${recordId}/edit`}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 border border-teal-600 rounded transition-colors shadow-lg"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Link>
        )}
        {canDelete && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded transition-colors shadow-lg cursor-pointer"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-[1px] bg-gray-900/5 cursor-not-allowed">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 cursor-default">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Record
                  </h3>
                  <p className="text-sm text-gray-500">
                    {tableName}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-gray-600 text-sm leading-relaxed">
                Are you sure you want to delete this record? The record will be moved to the Recycle Bin and can be restored later if needed.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-teal-600 bg-white hover:bg-gray-50 border border-teal-600 rounded transition-colors shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded transition-colors shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
