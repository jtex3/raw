"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Table, Rows, Edit, Plus } from 'lucide-react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { SmartForeignKeyReference } from '@/components/ui/smart-foreign-key-reference'
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
  const tableName = params.table as string
  const [records, setRecords] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnInfo, setColumnInfo] = useState<any[]>([])
  const [foreignKeys, setForeignKeys] = useState<any[]>([])
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
      setColumnInfo(colData || [])

      // Get foreign key information - truly automatic detection for any UUID column
      const allForeignKeys: any[] = []
      
      // Check for UUID columns that reference other tables by testing the reference
      const uuidColumns = colData?.filter((col: any) => 
        col.data_type === 'uuid' && col.column_name !== 'id'
      ) || []
      
      // Test all possible reference tables for each UUID column
      const possibleTables = ['organizations', 'profiles', 'roles', 'users']
      
      for (const col of uuidColumns) {
        for (const table of possibleTables) {
          // Test if this UUID column references table
          const { data: testData, error: testError } = await supabase
            .schema('system')
            .from(table)
            .select('id')
            .limit(1)
          
          if (!testError && testData) {
            // Now test if actual values from this column reference to table
            const { data: sampleValue, error: sampleError } = await supabase
              .schema('system')
              .from(tableName)
              .select(col.column_name)
              .not(col.column_name, 'is', null)
              .limit(1)
            
            if (!sampleError && sampleValue && sampleValue[0][col.column_name]) {
              const testValue = sampleValue[0][col.column_name]
              
              // Test if this value exists in the reference table
              const { data: referenceCheck, error: refError } = await supabase
                .schema('system')
                .from(table)
                .select('id')
                .eq('id', testValue)
                .single()
              
              if (!refError && referenceCheck) {
                // This column references this table!
                allForeignKeys.push({
                  column_name: col.column_name,
                  foreign_table_name: `system.${table}`,
                  foreign_column_name: 'id'
                })
                break // Found the reference table, move to next column
              }
            }
          }
        }
      }

      setForeignKeys(allForeignKeys)

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

  // Helper function to render cell content based on data type
  const renderCellContent = (value: any, columnName: string) => {
    if (value === null) {
      return <span className="text-gray-400 italic">NULL</span>
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
    
    // Check if this column is a foreign key UUID - handle ALL foreign keys automatically
    const foreignKey = foreignKeys.find(fk => fk.column_name === columnName)
    if (column?.data_type === 'uuid' && foreignKey) {
      console.log('Rendering foreign key:', { columnName, foreignKey, value })
      return (
        <SmartForeignKeyReference
          value={value}
          referenceTable={foreignKey.foreign_table_name}
          mode="view"
        />
      )
    }
    
    // Fallback for common foreign keys if detection fails
    if (column?.data_type === 'uuid') {
      if (columnName === 'org_id') {
        console.log('Fallback: rendering org_id as foreign key')
        return (
          <SmartForeignKeyReference
            value={value}
            referenceTable="system.organizations"
            mode="view"
          />
        )
      }
      if (columnName === 'profile_id') {
        console.log('Fallback: rendering profile_id as foreign key')
        return (
          <SmartForeignKeyReference
            value={value}
            referenceTable="system.profiles"
            mode="view"
          />
        )
      }
      if (columnName === 'role_id') {
        console.log('Fallback: rendering role_id as foreign key')
        return (
          <SmartForeignKeyReference
            value={value}
            referenceTable="system.roles"
            mode="view"
          />
        )
      }
      if (columnName === 'parent_role_id') {
        console.log('Fallback: rendering parent_role_id as foreign key')
        return (
          <SmartForeignKeyReference
            value={value}
            referenceTable="system.roles"
            mode="view"
          />
        )
      }
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
      {/* Floating Add Button */}
      <Link
        href={`/objects/${tableName}/records/new/edit`}
        className="absolute top-18 right-6 inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 border border-teal-600 rounded transition-colors shadow-lg"
        title="Add New Record"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Record
      </Link>

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
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <TableCell key={col} className="px-4 py-4 whitespace-nowrap text-sm">
                        {renderCellContent(row[col], col)}
                      </TableCell>
                    ))}
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/objects/${tableName}/records/${getRecordId(row, columnInfo)}/edit`}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 border border-teal-600 rounded transition-colors"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Link>
                    </TableCell>
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
