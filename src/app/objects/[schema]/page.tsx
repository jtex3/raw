/**
 * @fileoverview Objects (Tables & Views) Listing Page
 *
 * Lists all tables and views ("objects") available in the specified schema.
 * This page:
 * - Calls the `/api/schema?schema={schema}` endpoint to discover tables and views
 * - Displays table/view metadata and record counts
 * - Links to table details and record browsing pages
 * - Shows different icons for tables vs views
 */

"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Database, Table, Eye } from 'lucide-react'
import Link from 'next/link'

interface SchemaObject {
  table_name: string
  table_type: string
  record_count?: number
}

export default function SchemaObjectsPage() {
  const params = useParams()
  const schema = params.schema as string
  const [objects, setObjects] = useState<SchemaObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (schema) {
      fetchSchemaObjects()
    }
  }, [schema])

  const fetchSchemaObjects = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/schema?schema=${schema}`)

      if (!response.ok) {
        throw new Error('Failed to fetch schema objects')
      }

      const data = await response.json()

      if (!data.tables) {
        throw new Error('No tables data returned from API')
      }

      // Sort: tables first, then views, both alphabetically
      const sortedObjects = data.tables.sort((a: SchemaObject, b: SchemaObject) => {
        // First by type (BASE TABLE before VIEW)
        if (a.table_type !== b.table_type) {
          return a.table_type === 'BASE TABLE' ? -1 : 1
        }
        // Then alphabetically by name
        return a.table_name.localeCompare(b.table_name)
      })
      setObjects(sortedObjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const schemaLabel = schema === 'system' ? 'System Objects' : 'Business Objects'
  const schemaDescription = schema === 'system'
    ? 'All tables and objects in your Supabase system schema'
    : 'All tables and views in your business schema'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading schema objects...</span>
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
            onClick={fetchSchemaObjects}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Separate tables and views for section headers
  const tables = objects.filter(obj => obj.table_type === 'BASE TABLE')
  const views = objects.filter(obj => obj.table_type === 'VIEW')

  const renderObject = (object: SchemaObject) => {
    const isView = object.table_type === 'VIEW'
    return (
      <div
        key={object.table_name}
        className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          {isView ? (
            <Eye className="h-5 w-5 text-purple-600 flex-shrink-0" />
          ) : (
            <Table className="h-5 w-5 text-teal-600 flex-shrink-0" />
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {object.table_name}
            </h3>
            <p className="text-sm text-gray-500">
              <span className={isView ? 'text-purple-600' : 'text-teal-600'}>
                {isView ? 'View' : 'Table'}
              </span>
              {object.record_count !== undefined && (
                <>
                  {' • '}
                  <Link
                    href={`/objects/${schema}/${object.table_name}/records`}
                    className="text-teal-600 hover:text-teal-700 underline"
                  >
                    {object.record_count} records
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <Link
          href={`/objects/${schema}/${object.table_name}`}
          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
        >
          View Details
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Database className="mr-3 h-8 w-8 text-teal-600" />
          {schemaLabel}
        </h1>
        <p className="text-gray-600 mt-2">
          {schemaDescription}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {objects.map((object) => renderObject(object))}
        </div>
      </div>

      {objects.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No objects found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No tables or views were found in the {schema} schema.
          </p>
        </div>
      )}
    </div>
  )
}
