'use client'

import { useState, FormEvent } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState<string>('admin@system.com')
  const [password, setPassword] = useState<string>('smartsolution')
  const [message, setMessage] = useState<string>('')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Success! User ID: ' + data.user.id)
    }
  }

  return (
    <div style={{ padding: '50px' }}>
      <h1>Login Test</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <br/>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <br/>
        <button type="submit">Login</button>
      </form>
      <p>{message}</p>
    </div>
  )
}