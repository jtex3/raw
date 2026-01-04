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
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`)
    }
    
    return NextResponse.json({
      success: true,
      connected: true,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      message: 'Supabase connection successful!',
      data: data
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Supabase test error:', errorMessage)
    return NextResponse.json({
      success: false,
      connected: false,
      error: errorMessage
    }, { status: 500 })
  }
}