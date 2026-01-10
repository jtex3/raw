/**
  * @fileoverview Schema Discovery API Route
  *
  * Returns a list of tables in the specified schema along with record counts.
  * This endpoint is used by the Objects UI to dynamically discover available objects.
  *
  * Query Parameters:
  * - schema: 'system' | 'public' (defaults to 'system')
  *
  * Notes:
  * - Tables are filtered based on user's profile_object_permissions.
  * - By default, if there's no permission entry for a table, access is denied.
  * - Uses authenticated client to respect user permissions.
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema') || 'system'

    // Validate schema parameter
    if (schema !== 'system' && schema !== 'public') {
      return NextResponse.json(
        { error: 'Invalid schema. Must be "system" or "public".' },
        { status: 400 }
      )
    }

    // Use authenticated client to respect user permissions
    const supabase = await createClient()

    // Get objects accessible to the current user based on their profile permissions
    // Each schema has its own get_accessible_objects() function
    const { data: accessibleObjects, error: accessError } = await supabase.schema(schema)
      .rpc('get_accessible_objects')

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
    const tablesWithCounts = await Promise.all(
      (accessibleObjects as AccessibleObject[]).map(async (obj) => {
        try {
          const { count, error } = await supabase
            .schema('system')
            .from(obj.object_name)
            .select('*', { count: 'exact', head: true })

          if (error) {
            console.error(`Error counting ${obj.object_name}:`, error)
            // Return 0 count on error instead of failing the entire request
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

    return NextResponse.json({ tables: tablesWithCounts })
  } catch (error) {
    console.error('Error in schema API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
