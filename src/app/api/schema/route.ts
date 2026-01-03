import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Return known tables without verification for now
    const knownTables = [
      { table_name: 'organizations', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'roles', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'profiles', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'users', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'profile_object_permissions', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'profile_field_permissions', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'org_wide_defaults', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'sharing_rules', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'manual_shares', table_type: 'BASE TABLE', record_count: 0 },
      { table_name: 'list_views', table_type: 'BASE TABLE', record_count: 0 },
    ]
    
    return NextResponse.json({ tables: knownTables })
  } catch (error) {
    console.error('Error in schema API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
