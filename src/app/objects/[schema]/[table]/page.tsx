/**
  * @fileoverview Table Details Page
  *
  * Shows column metadata for a selected table in the Supabase `system` schema.
  * Uses the `get_schema_system_tables_columns` RPC to fetch and display:
  * - Column name
  * - Data type
  * - Nullability
  * - Default value
  */

"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Table, Columns } from 'lucide-react'
import Link from 'next/link'

interface TableColumn {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

export default function TableDetailsPage() {
  const params = useParams()
  const schema = params.schema as string
  const tableName = params.table as string
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (tableName) {
      fetchTableColumns()
    }
  }, [tableName])

  const fetchTableColumns = async () => {
    try {
      setLoading(true)
      const { data, error: rpcError } = await supabase
        .schema('system')
        .rpc('get_schema_object_columns', { target_schema: schema, target_table: tableName })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      if (!data) {
        throw new Error('No column data returned from API')
      }

      // Sort columns alphabetically by column_name
      const sortedColumns = data.sort((a: TableColumn, b: TableColumn) => a.column_name.localeCompare(b.column_name))
      setColumns(sortedColumns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading table columns...</span>
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
            onClick={fetchTableColumns}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header with back navigation */}
      <div className="mb-6">
        <Link
          href={`/objects/${schema}`}
          className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Objects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Table className="mr-3 h-8 w-8 text-teal-600" />
          {tableName}
        </h1>
        <p className="text-gray-600 mt-2">
          Column definitions for this table in the {schema} schema
        </p>
      </div>

      {/* Columns table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {columns.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nullable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {columns.map((col) => (
                <tr key={col.column_name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <Columns className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                      {col.column_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {col.data_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        col.is_nullable === 'YES'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {col.is_nullable}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {col.column_default || (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Columns className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No columns found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This table appears to have no columns or could not be read.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
