/**
  * @fileoverview Login Page
  *
  * Provides the sign-in experience for the Raw System application.
  * - Collects email/password
  * - Authenticates via Supabase Auth
  * - Redirects to the dashboard on success
  * - Shows basic loading and error states
  */
 
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Login page component
 * 
 * Provides the authentication interface for users to sign in to the Raw System.
 * Handles email/password authentication via Supabase Auth with proper error
 * handling and loading states. Redirects to dashboard upon successful login.
 * 
 * @returns {JSX.Element} Login form with email/password inputs and submit handling
 */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  /**
   * Handles the login form submission
   * 
   * Authenticates the user with Supabase Auth using email/password credentials.
   * Updates loading and error states appropriately, and redirects to dashboard
   * on successful authentication.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      console.error('Login error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 text-center">{error}</div>
            )}
            <div className="space-y-2">
              <Button 
                type="submit" 
                className="w-full bg-teal-700 hover:bg-teal-800" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}