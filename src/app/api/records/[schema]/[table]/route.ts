/**
 * @fileoverview Unified Schema Records API Route
 *
 * Returns records for tables in any schema (system, business, recycle, etc.).
 * Uses the server client to properly handle RLS and schema access.
 *
 * Query Parameters:
 * - limit: max records to return (default 1000)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  schema: string
  table: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { schema, table } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '1000')

    const supabase = await createClient()

    // Validate table exists in the specified schema
    const { data: validObjects, error: validationError } = await supabase
      .schema('system')
      .rpc('get_schema_objects', { p_schema: schema })

    if (validationError) {
      console.error('Error validating table:', validationError)
    }

    const validTableNames = validObjects?.map((obj: any) => obj.table_name) || []
    if (!validTableNames.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table name', records: [], columns: [] },
        { status: 400 }
      )
    }

    let records: any[] = []

    // For business schema, use the get_schema_table_data RPC function
    if (schema === 'business') {
      const { data: recordsData, error: recordsError } = await supabase
        .schema('system')
        .rpc('get_schema_table_data', {
          p_schema: 'business',
          p_table_name: table,
          p_limit: limit
        })

      if (recordsError) {
        console.error('Error fetching business records:', recordsError)
        return NextResponse.json(
          { error: recordsError.message, records: [], columns: [] },
          { status: 500 }
        )
      }

      // Parse the JSON result from the RPC function
      if (recordsData && Array.isArray(recordsData)) {
        records = recordsData
      } else if (recordsData && typeof recordsData === 'object' && recordsData !== null) {
        records = [recordsData]
      }
    } else {
      // For other schemas (system, recycle, etc.), use direct query
      const { data: recordsData, error: recordsError } = await supabase
        .schema(schema)
        .from(table)
        .select('*')
        .limit(limit)

      if (recordsError) {
        console.error(`Error fetching ${schema} records:`, recordsError)
        return NextResponse.json(
          { error: recordsError.message, records: [], columns: [] },
          { status: 500 }
        )
      }

      records = recordsData || []
    }

    // Get column info
    let columns: any[] = []
    try {
      const { data: colData } = await supabase
        .schema('system')
        .rpc('get_schema_object_columns', {
          target_schema: schema,
          target_table: table
        })
      columns = colData || []
    } catch {
      // Fallback column info from records
      if (records.length > 0) {
        columns = Object.keys(records[0]).map(key => ({
          column_name: key,
          data_type: typeof records[0][key],
          is_nullable: 'YES'
        }))
      }
    }

    // Determine if it's a table or view
    const isTable = validObjects?.find((obj: any) => obj.table_name === table)?.table_type === 'BASE TABLE'

    return NextResponse.json({
      records,
      columns,
      table_type: isTable ? 'BASE TABLE' : 'VIEW'
    })
  } catch (error) {
    console.error('Error in records API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred', records: [], columns: [] },
      { status: 500 }
    )
  }
}
