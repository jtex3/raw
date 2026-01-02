//TEST SUPABASE CONNECTION with .env.local KEYS
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )

    // Test the connection
    const { data, error } = await supabase.from('_test_').select('*').limit(1)
    
    return NextResponse.json({
      success: true,
      connected: true,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      message: 'Supabase connection successful!',
      error: error?.message || null
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: err.message
    }, { status: 500 })
  }
}