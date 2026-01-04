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
    
    // Dynamically get all tables from the public schema
    const { data: sqlTables, error: sqlError } = await supabase
      .rpc('get_schema_public_tables')
    
    if (sqlError) {
      return NextResponse.json(
        { error: sqlError }
      )
    }
    
    const tableList = sqlTables?.map((t: { table_name: string, table_type: string }) => ({ 
    table_name: t.table_name, 
    table_type: t.table_type 
  })) || []
    
    // Get actual record counts for each table
    const tablesWithCounts = await Promise.all(
      tableList.map(async (table: { table_name: string, table_type: string }) => {
        try {
          const { count, error } = await supabase
            .from(table.table_name)
            .select('*', { count: 'exact', head: true })
          
          if (error) {
            return {
              table_name: table.table_name,
              table_type: table.table_type,
              record_count: 'ERR',
              error: error
            }
          }
          
          return {
            table_name: table.table_name,
            table_type: table.table_type,
            record_count: count || 0
          }
        } catch (err) {
          return {
            table_name: table.table_name,
            table_type: table.table_type,
            record_count: 'ERR',
            error: err
          }
        }
      })
    )
    
    return NextResponse.json({ tables: tablesWithCounts })
  } catch (error) {
    console.error('Error in schema API:', error)
    return NextResponse.json(
      { error }
    )
  }
}
