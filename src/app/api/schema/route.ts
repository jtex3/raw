/**
  * @fileoverview Schema Discovery API Route
  *
  * Returns a list of tables in the Supabase `system` schema along with record counts.
  * This endpoint is used by the Objects UI to dynamically discover available objects.
  *
  * Notes:
  * - Tables are filtered based on user's profile_object_permissions.
  * - By default, if there's no permission entry for a table, access is denied.
  * - Uses authenticated client to respect user permissions.
  */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface AccessibleTable {
  table_name: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

export async function GET() {
  try {
    // Use authenticated client to respect user permissions
    const supabase = await createClient()

    // Get tables accessible to the current user based on their profile permissions
    const { data: accessibleTables, error: accessError } = await supabase.schema('system')
      .rpc('get_accessible_tables')

    if (accessError) {
      console.error('Error fetching accessible tables:', accessError)
      return NextResponse.json(
        { error: accessError.message },
        { status: 500 }
      )
    }

    // If no accessible tables (no permissions), return empty array
    if (!accessibleTables || accessibleTables.length === 0) {
      return NextResponse.json({ tables: [] })
    }

    // Get actual record counts for each accessible table
    const tablesWithCounts = await Promise.all(
      (accessibleTables as AccessibleTable[]).map(async (table) => {
        try {
          const { count, error } = await supabase
            .schema('system')
            .from(table.table_name)
            .select('*', { count: 'exact', head: true })

          if (error) {
            console.error(`Error counting ${table.table_name}:`, error)
            // Return 0 count on error instead of failing the entire request
            return {
              table_name: table.table_name,
              table_type: 'BASE TABLE',
              record_count: 0,
              can_create: table.can_create,
              can_read: table.can_read,
              can_update: table.can_update,
              can_delete: table.can_delete
            }
          }

          return {
            table_name: table.table_name,
            table_type: 'BASE TABLE',
            record_count: count ?? 0,
            can_create: table.can_create,
            can_read: table.can_read,
            can_update: table.can_update,
            can_delete: table.can_delete
          }
        } catch (err) {
          console.error(`Failed to process table ${table.table_name}:`, err)
          return {
            table_name: table.table_name,
            table_type: 'BASE TABLE',
            record_count: 0,
            can_create: table.can_create,
            can_read: table.can_read,
            can_update: table.can_update,
            can_delete: table.can_delete
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
