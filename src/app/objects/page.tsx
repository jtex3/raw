"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Database, Table } from 'lucide-react'

interface SchemaObject {
  table_name: string
  table_type: string
  record_count?: number
}

export default function ObjectsPage() {
  const [objects, setObjects] = useState<SchemaObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchSchemaObjects()
  }, [])

  const fetchSchemaObjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/schema')
      
      if (!response.ok) {
        throw new Error('Failed to fetch schema objects')
      }
      
      const data = await response.json()
      setObjects(data.tables || [])
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Database className="mr-3 h-8 w-8 text-teal-600" />
          Schema Objects
        </h1>
        <p className="text-gray-600 mt-2">
          All tables and objects in your Supabase public schema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {objects.map((object) => (
          <Card key={object.table_name} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Table className="mr-2 h-5 w-5 text-teal-600" />
                {object.table_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <Badge variant={object.table_type === 'BASE TABLE' ? 'default' : 'secondary'}>
                  {object.table_type}
                </Badge>
                <span className="text-sm text-gray-500">
                  {object.record_count !== undefined ? `${object.record_count} records` : 'Unknown count'}
                </span>
              </div>
              <button
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                onClick={() => {
                  // TODO: Navigate to table details page
                  console.log(`Navigate to ${object.table_name} details`)
                }}
              >
                View Details
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {objects.length === 0 && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No objects found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No tables were found in your public schema.
          </p>
        </div>
      )}
    </div>
  )
}
