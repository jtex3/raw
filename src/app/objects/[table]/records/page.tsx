"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Table, Rows } from 'lucide-react'
import Link from 'next/link'

export default function TableRecordsPage() {
  const params = useParams()
  const tableName = params.table as string
  const [records, setRecords] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (tableName) {
      fetchTableRecords()
    }
  }, [tableName])

  const fetchTableRecords = async () => {
    try {
      setLoading(true)

      // First, get column names to display as headers
      const { data: colData, error: colError } = await supabase
        .schema('system')
        .rpc('get_schema_system_tables_columns', { target_table: tableName })

      if (colError) {
        throw new Error(colError.message)
      }

      const columnNames = colData?.map((c: any) => c.column_name) || []
      setColumns(columnNames)

      // Then fetch all records
      const { data, error: recError } = await supabase
        .schema('system')
        .from(tableName)
        .select('*')
        .limit(1000) // reasonable limit for UI

      if (recError) {
        throw new Error(recError.message)
      }

      setRecords(data || [])
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
        <span className="ml-2 text-gray-600">Loading table records...</span>
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
            onClick={fetchTableRecords}
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
          href="/objects"
          className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Objects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Rows className="mr-3 h-8 w-8 text-teal-600" />
          {tableName} Records
        </h1>
        <p className="text-gray-600 mt-2">
          {records.length} records found
        </p>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {records.length > 0 && columns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {row[col] === null ? (
                          <span className="text-gray-400 italic">NULL</span>
                        ) : typeof row[col] === 'object' && row[col] !== null ? (
                          <span className="text-gray-600 font-mono text-xs">
                            {JSON.stringify(row[col])}
                          </span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Rows className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This table is empty or could not be read.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
