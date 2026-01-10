/**
  * @fileoverview Schema Discovery API Route
  *
  * Returns a list of tables in the Supabase `system` schema along with record counts.
  * This endpoint is used by the Objects UI to dynamically discover available objects.
  *
  * Notes:
  * - If `SUPABASE_SERVICE_ROLE_KEY` is present, counts are performed with an admin client.
  * - Otherwise, falls back to the authenticated server client.
  */
 
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Create admin client using service role key if available, otherwise use regular client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    let supabase
    if (serviceRoleKey) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      supabase = createAdminClient(supabaseUrl, serviceRoleKey)
    } else {
      supabase = await createClient()
    }
    
    // Dynamically get all tables from the system schema
    const { data: sqlTables, error: sqlError } = await supabase.schema('system')
      .rpc('get_schema_system_tables')
    
    console.log('RPC Response:', { sqlTables, sqlError })
    
    if (sqlError) {
      console.error('SQL Error:', sqlError)
      return NextResponse.json(
        { error: sqlError }
      )
    }
    
    if (!sqlTables) {
      console.error('No data returned from get_schema_system_tables')
      return NextResponse.json(
        { error: 'No data returned from schema query' },
        { status: 500 }
      )
    }
    
    const tableList = sqlTables.map((t: { table_name: string, table_type: string }) => ({ 
      table_name: t.table_name, 
      table_type: t.table_type 
    }))
    
    console.log('Table List:', tableList)
    console.log('SQL Tables raw:', sqlTables)
    
    // Get actual record counts for each table
    const tablesWithCounts = await Promise.all(
      tableList.map(async (table: { table_name: string, table_type: string }) => {
        try {
          const { count, error } = await supabase
            .schema('system')
            .from(table.table_name)
            .select('*', { count: 'exact', head: true })
          
          console.log(table.table_name);
            
          console.log(`Count for ${table.table_name}:`, { count, error });
          
          if (error) {
            console.error(`Error counting ${table.table_name}:`, error);
            throw new Error(`Failed to count records for ${table.table_name}: ${error.message}`)
          }
          
          return {
            table_name: table.table_name,
            table_type: table.table_type,
            record_count: count
          }
        } catch (err) {
          throw new Error(`Failed to process table ${table.table_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      })
    )
    
    return NextResponse.json({ tables: tablesWithCounts })
  } catch (error) {
    console.error('Error in schema API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
    )
  }
}
