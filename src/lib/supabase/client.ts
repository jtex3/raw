/**
 * @fileoverview Supabase Browser Client Configuration
 * 
 * This module provides the client-side Supabase client configuration for the Raw System.
 * It creates a browser-compatible Supabase client that can be used in React components
 * and client-side code for:
 * - User authentication operations
 * - Real-time database queries
 * - Row Level Security (RLS) enforcement
 * - Multi-tenant data access
 * 
 * The client automatically handles session management and cookie-based authentication
 * for seamless user experience across page refreshes and navigation.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates and configures a Supabase browser client instance
 * 
 * This function initializes a Supabase client for use in browser/client-side contexts.
 * It automatically handles session management and cookie-based authentication.
 * 
 * @returns {SupabaseClient} Configured Supabase client for browser use with:
 *   - Automatic session refresh
 *   - Cookie-based persistence
 *   - Real-time subscriptions support
 *   - Row Level Security enforcement
 * 
 * @throws {Error} If NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
 *                 environment variables are not set
 * 
 * @example
 * ```typescript
 * const supabase = createClient()
 * const { data: user } = await supabase.auth.getUser()
 * const { data: records } = await supabase.from('organizations').select('*')
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: {
        schema: 'public, system, recycle'
      }
    }
  )
}
