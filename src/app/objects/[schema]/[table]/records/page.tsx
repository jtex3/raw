/**
  * @fileoverview Table Records Listing Page
  *
  * Displays up to 1000 records for a selected table in any schema (system, business, recycle, etc.).
  * Uses unified API endpoint /api/records/[schema]/[table] for server-side data fetching.
  * Features:
  * - Dynamic column discovery via API
  * - Pre-fetches all foreign key reference data to avoid flickering
  * - Automatic rendering of booleans and foreign-key UUID references
  * - Links to edit individual records
  * - Shortcut to create a new record
  */

"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ArrowLeft, Rows, Plus } from 'lucide-react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { InlineFkDisplay } from '@/components/ui/inline-fk-display'
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function TableRecordsPage() {
  const params = useParams()
  const schema = params.schema as string
  const tableName = params.table as string
  const [records, setRecords] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnInfo, setColumnInfo] = useState<any[]>([])
  const [foreignKeys, setForeignKeys] = useState<any[]>([])
  const [referenceData, setReferenceData] = useState<Map<string, Map<string, any>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canCreate, setCanCreate] = useState(false)

  useEffect(() => {
    if (tableName) {
      fetchTableRecords()
      fetchPermissions()
    }
  }, [tableName])

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`/api/schema?schema=${schema}`)
      if (response.ok) {
        const data = await response.json()
        const tablePermissions = data.tables?.find(
          (t: any) => t.table_name === tableName
        )
        if (tablePermissions) {
          setCanCreate(tablePermissions.can_create === true)
        }
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err)
    }
  }

  const fetchTableRecords = async () => {
    try {
      setLoading(true)

      // Use unified API endpoint for all schemas
      let colData: any[] = []
      let recData: any[] = []

      const response = await fetch(`/api/records/${schema}/${tableName}?limit=1000`)
      if (response.ok) {
        const data = await response.json()
        colData = data.columns || []
        recData = data.records || []

        // Check for error message
        if (data.error && recData.length === 0) {
          throw new Error(data.error)
        }
      } else {
        const errData = await response.json()
        throw new Error(errData.error || `Failed to fetch ${schema} records`)
      }

      // Filter out display_name column for entity and entity_junction tables
      const columnNames = colData
        ?.map((c: any) => c.column_name)
        .filter((col: string) => !(
          (schema === 'business' && (tableName === 'entity' || tableName === 'entity_junction') && col === 'display_name')
        )) || []
      setColumns(columnNames)
      setColumnInfo(colData)

      // Fetch foreign key information from API
      let fkList: any[] = []
      try {
        const fkResponse = await fetch(`/api/schema/foreign-keys?schema=${schema}&table=${tableName}`)
        if (fkResponse.ok) {
          const fkData = await fkResponse.json()
          fkList = fkData.foreignKeys || []
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

      // Pre-fetch all reference data for foreign keys to avoid flickering
      const refDataMap = new Map<string, Map<string, any>>()
      const uniqueRefTables = [...new Set(fkList.map((fk: any) => `${fk.foreign_schema_name}.${fk.foreign_table_name}`))]

      await Promise.all(
        uniqueRefTables.map(async (refTable) => {
          try {
            const [refSchema, refTableName] = refTable.split('.')
            const refResponse = await fetch(`/api/records/${refSchema}/${refTableName}?limit=1000`)
            if (refResponse.ok) {
              const refData = await refResponse.json()
              const recordsMap = new Map<string, any>(
                (refData.records || []).map((r: any) => [r.id, r])
              )
              refDataMap.set(refTable, recordsMap)
            }
          } catch (err) {
            console.error(`Failed to fetch reference data for ${refTable}:`, err)
          }
        })
      )

      setReferenceData(refDataMap)
      setRecords(recData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to render cell content based on data type
  const renderCellContent = (value: any, columnName: string, row?: any) => {
    if (value === null) {
      return <span className="text-gray-400 italic">NULL</span>
    }

    // Make the 'name' field a clickable link to view the record
    if (columnName === 'name' && row) {
      const recordId = getRecordId(row, columnInfo)
      return (
        <Link
          href={`/objects/${schema}/${tableName}/records/${recordId}/view`}
          className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
        >
          {String(value)}
        </Link>
      )
    }

    // Check if this column is a boolean type
    const column = columnInfo.find(c => c.column_name === columnName)
    if (column?.data_type === 'boolean') {
      return (
        <Checkbox
          checked={Boolean(value)}
          disabled
          className="pointer-events-none"
        />
      )
    }

    // Check if this column is a foreign key UUID - use pre-fetched data
    const foreignKey = foreignKeys.find(fk => fk.column_name === columnName)
    if (column?.data_type === 'uuid' && foreignKey) {
      const refTable = foreignKey.foreign_table_name
      const refMap = referenceData.get(refTable)
      const refRecord = refMap?.get(value)

      // Determine display field (prefer 'name', fallback to 'profile_name', 'org_name', or first column)
      const displayField = refRecord?.name || refRecord?.profile_name || refRecord?.org_name || refRecord?.email || value

      return (
        <InlineFkDisplay
          value={value}
          displayValue={displayField}
          referenceTable={refTable}
        />
      )
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="text-gray-600 font-mono text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    return String(value)
  }

  // Helper function to get the primary key value for a record
  const getRecordId = (row: any, cols: any[]) => {
    // Try to find UUID columns first (common primary keys)
    const uuidCol = cols.find(c => c.data_type === 'uuid' && row[c.column_name])
    if (uuidCol) return row[uuidCol.column_name]

    // Fallback to first column that has a value
    const firstCol = cols.find(c => row[c.column_name] !== null && row[c.column_name] !== undefined)
    return firstCol ? row[firstCol.column_name] : row[Object.keys(row)[0]]
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
    <div className="p-6 relative">
      {/* Floating Add Button - only show if user has create permission */}
      {canCreate && (
        <Link
          href={`/objects/${schema}/${tableName}/records/new/edit`}
          className="absolute top-18 right-6 inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 border border-teal-600 rounded transition-colors shadow-lg"
          title="Add New Record"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Record
        </Link>
      )}

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
          <Rows className="mr-3 h-8 w-8 text-teal-600" />
          {tableName} Records
        </h1>
        <p className="text-gray-600 mt-2">
          {records.length} records found
        </p>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {records.length > 0 && columns.length > 0 ? (
          <div className="rounded-md border">
            <ShadcnTable>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <TableCell key={col} className="px-4 py-4 whitespace-nowrap text-sm">
                        {renderCellContent(row[col], col, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ShadcnTable>
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
