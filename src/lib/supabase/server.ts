/**
 * @fileoverview Supabase Server Client Configuration
 * 
 * This module provides the server-side Supabase client configuration for the Raw System.
 * It creates a server-compatible Supabase client that can be used in:
 * - Server Components
 * - API Routes
 * - Server Actions
 * - Middleware
 * 
 * The server client handles cookie-based session management and ensures proper
 * authentication state across server-side operations while maintaining security
 * and performance for the multi-tenant architecture.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates and configures a Supabase server client instance
 * 
 * This function initializes a Supabase client for use in server-side contexts including
 * Server Components, API Routes, Server Actions, and Middleware. It properly handles
 * cookie-based session management for server-side authentication.
 * 
 * @returns {Promise<SupabaseClient>} Configured Supabase client for server use with:
 *   - Server-side session management
 *   - Cookie synchronization with client
 *   - Row Level Security enforcement
 *   - Access to service-level operations
 * 
 * @throws {Error} If NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
 *                 environment variables are not set
 * 
 * @example
 * ```typescript
 * // In a Server Component
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * 
 * // In an API Route
 * export async function GET() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('organizations').select('*')
 *   return Response.json(data)
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
