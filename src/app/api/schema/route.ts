/**
 * @fileoverview Schema Discovery API Route
 *
 * Returns a list of tables and views in the specified schema along with record counts.
 * This endpoint is used by the Objects UI to dynamically discover available objects.
 *
 * Query Parameters:
 * - schema: 'system' | 'business' (defaults to 'system')
 *
 * Notes:
 * - Uses generic get_schema_table_data function to query any schema
 * - For 'system' schema: Tables are filtered based on user's profile_object_permissions.
 * - For 'business' schema: All tables and views are accessible.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface AccessibleObject {
  object_name: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

interface SchemaObject {
  table_name: string
  table_type: string
  record_count?: number
  can_create?: boolean
  can_read?: boolean
  can_update?: boolean
  can_delete?: boolean
}

// Helper function to count records in a table using the generic RPC function
async function getRecordCount(supabase: any, schema: string, tableName: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .schema('system')
      .rpc('get_schema_table_data', {
        p_schema: schema,
        p_table_name: tableName,
        p_limit: 10000
      })

    if (error) {
      console.error(`Error counting ${schema}.${tableName}:`, error)
      return 0
    }

    // Parse JSON result
    if (Array.isArray(data)) {
      return data.length
    } else if (typeof data === 'object' && data !== null) {
      // JSON array returned as object
      return Array.isArray(data) ? data.length : 1
    }

    return 0
  } catch (err) {
    console.error(`Failed to count ${schema}.${tableName}:`, err)
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema') || 'system'

    // Validate schema parameter
    if (schema !== 'system' && schema !== 'business') {
      return NextResponse.json(
        { error: 'Invalid schema. Must be "system" or "business".' },
        { status: 400 }
      )
    }

    // Use authenticated client to respect user permissions
    const supabase = await createClient()

    let objectsWithCounts: SchemaObject[] = []

    if (schema === 'business') {
      // Discover all tables and views in business schema
      const { data: schemaObjects, error: objectsError } = await supabase
        .schema('system')
        .rpc('get_schema_objects', { p_schema: 'business' })

      if (objectsError) {
        console.error('Error fetching business schema objects:', objectsError)
        return NextResponse.json(
          { error: objectsError.message },
          { status: 500 }
        )
      }

      if (Array.isArray(schemaObjects) && schemaObjects.length > 0) {
        // Get record counts for each object
        objectsWithCounts = await Promise.all(
          schemaObjects.map(async (obj: any) => {
            const recordCount = await getRecordCount(supabase, 'business', obj.table_name)

            return {
              table_name: obj.table_name,
              table_type: obj.table_type,
              record_count: recordCount,
              can_create: obj.table_type === 'BASE TABLE',
              can_read: true,
              can_update: obj.table_type === 'BASE TABLE',
              can_delete: obj.table_type === 'BASE TABLE'
            }
          })
        )
      }
    } else {
      // For system schema, use the existing permission-based approach
      const { data: accessibleObjects, error: accessError } = await supabase
        .schema('system')
        .rpc('get_accessible_objects', { p_schema: schema })

      if (accessError) {
        console.error('Error fetching accessible objects:', accessError)
        return NextResponse.json(
          { error: accessError.message },
          { status: 500 }
        )
      }

      // If no accessible objects (no permissions), return empty array
      if (!accessibleObjects || accessibleObjects.length === 0) {
        return NextResponse.json({ tables: [] })
      }

      // Get actual record counts for each accessible object
      objectsWithCounts = await Promise.all(
        (accessibleObjects as AccessibleObject[]).map(async (obj) => {
          try {
            const { count, error } = await supabase
              .schema(schema)
              .from(obj.object_name)
              .select('*', { count: 'exact', head: true })

            if (error) {
              console.error(`Error counting ${obj.object_name}:`, error)
              return {
                table_name: obj.object_name,
                table_type: 'BASE TABLE',
                record_count: 0,
                can_create: obj.can_create,
                can_read: obj.can_read,
                can_update: obj.can_update,
                can_delete: obj.can_delete
              }
            }

            return {
              table_name: obj.object_name,
              table_type: 'BASE TABLE',
              record_count: count ?? 0,
              can_create: obj.can_create,
              can_read: obj.can_read,
              can_update: obj.can_update,
              can_delete: obj.can_delete
            }
          } catch (err) {
            console.error(`Failed to process object ${obj.object_name}:`, err)
            return {
              table_name: obj.object_name,
              table_type: 'BASE TABLE',
              record_count: 0,
              can_create: obj.can_create,
              can_read: obj.can_read,
              can_update: obj.can_update,
              can_delete: obj.can_delete
            }
          }
        })
      )
    }

    return NextResponse.json({ tables: objectsWithCounts })
  } catch (error) {
    console.error('Error in schema API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
