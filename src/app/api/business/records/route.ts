/**
 * @fileoverview Business Schema Records API Route
 *
 * Returns records for tables in the business schema.
 * Uses generic get_schema_table_data RPC function to query any schema.
 *
 * Query Parameters:
 * - table: table name to query
 * - limit: max records to return (default 1000)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const table = searchParams.get('table')
    const limit = parseInt(searchParams.get('limit') || '1000')

    if (!table) {
      return NextResponse.json(
        { error: 'Table parameter is required' },
        { status: 400 }
      )
    }

    // Security: validate table name against known business objects
    // This prevents SQL injection while allowing dynamic discovery
    const { data: validObjects, error: validationError } = await (await createClient())
      .schema('system')
      .rpc('get_schema_objects', { p_schema: 'business' })

    const validTableNames = validObjects?.map((obj: any) => obj.table_name) || []
    if (!validTableNames.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use the generic get_schema_table_data function
    const { data: recordsData, error: recordsError } = await supabase
      .schema('system')
      .rpc('get_schema_table_data', {
        p_schema: 'business',
        p_table_name: table,
        p_limit: limit
      })

    let records: any[] = []
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
      // Single object or wrapped result
      records = [recordsData]
    }

    // Get column info
    let columns: any[] = []
    try {
      const { data: colData } = await supabase
        .schema('system')
        .rpc('get_schema_object_columns', {
          target_schema: 'business',
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
    console.error('Error in business records API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred', records: [], columns: [] },
      { status: 500 }
    )
  }
}
