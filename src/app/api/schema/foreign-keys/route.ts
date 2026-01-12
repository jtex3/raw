/**
 * @fileoverview Foreign Keys API Route
 *
 * Returns foreign key information for tables in a given schema.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const table = searchParams.get('table')

    if (!schema || !table) {
      return NextResponse.json(
        { error: 'Schema and table parameters are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get foreign key information using system schema RPC
    const { data, error } = await supabase
      .schema('system')
      .rpc('get_table_foreign_keys', {
        target_schema: schema,
        target_table: table
      })

    if (error) {
      console.error('Error fetching foreign keys:', error)
      return NextResponse.json(
        { error: error.message, foreignKeys: [] },
        { status: 500 }
      )
    }

    const foreignKeys = data || []

    return NextResponse.json({ foreignKeys })
  } catch (error) {
    console.error('Error in foreign keys API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred', foreignKeys: [] },
      { status: 500 }
    )
  }
}
