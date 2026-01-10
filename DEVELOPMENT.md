# Development Guidelines

This document outlines the coding standards, best practices, and development workflow for the Raw System project.

## 📋 Table of Contents

- [Code Style](#code-style)
- [TypeScript Guidelines](#typescript-guidelines)
- [React Component Standards](#react-component-standards)
- [Database Conventions](#database-conventions)
- [Error Handling](#error-handling)
- [Testing Standards](#testing-standards)
- [Git Workflow](#git-workflow)
- [Performance Guidelines](#performance-guidelines)

## 🎨 Code Style

### General Principles
- **Consistency**: Follow established patterns throughout the codebase
- **Readability**: Write code that tells a story
- **Simplicity**: Prefer simple solutions over complex ones
- **Type Safety**: Leverage TypeScript's type system fully

### File Naming Conventions
```
Components:     PascalCase (UserProfile.tsx)
Pages:          kebab-case (user-profile.tsx) 
Utilities:      kebab-case (foreign-key-config.ts)
Types:          kebab-case (foreign-key.ts)
Constants:      UPPER_SNAKE_CASE (API_ENDPOINTS.ts)
```

### Import Organization
```typescript
// 1. React and Next.js imports
import React from 'react'
import { NextRequest } from 'next/server'

// 2. Third-party libraries
import { createClient } from '@supabase/supabase-js'
import { clsx } from 'clsx'

// 3. Internal imports (absolute paths)
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

// 4. Relative imports
import './styles.css'
```

## 📘 TypeScript Guidelines

### Type Definitions
- Use interfaces for object shapes that might be extended
- Use type aliases for unions, primitives, and computed types
- Prefer explicit return types for public functions
- Use generic constraints when appropriate

```typescript
// Good
interface User {
  id: string
  email: string
  profile: Profile
}

type Status = 'loading' | 'success' | 'error'

function fetchUser(id: string): Promise<User | null> {
  // implementation
}
```

### Null Safety
- Use strict null checks
- Prefer explicit null/undefined handling
- Use optional chaining and nullish coalescing

```typescript
// Good
const userName = user?.profile?.name ?? 'Unknown'

// Avoid
const userName = user.profile.name || 'Unknown'
```

## ⚛️ React Component Standards

### Component Structure
```typescript
/**
 * Component documentation with JSDoc
 */
interface ComponentProps {
  // Props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks
  const [state, setState] = useState()
  
  // 2. Event handlers
  const handleClick = useCallback(() => {
    // handler logic
  }, [dependencies])
  
  // 3. Effects
  useEffect(() => {
    // effect logic
  }, [dependencies])
  
  // 4. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Props and State
- Always define prop interfaces
- Use discriminated unions for variant props
- Prefer controlled components
- Use proper key props for lists

## 🗄️ Database Conventions

### Table Design
- Use UUID primary keys
- Include created_at and updated_at timestamps
- Follow snake_case naming
- Implement proper foreign key constraints

### RLS Policies
- Every table must have RLS enabled
- Policies should enforce tenant isolation
- Use helper functions for complex logic
- Test policies with multiple user contexts

### Migrations
- Use descriptive migration names
- Include rollback instructions in comments
- Test migrations on sample data
- Document breaking changes

## 🚨 Error Handling

### Client-Side Errors
```typescript
// Use proper error boundaries
function ComponentWithErrorBoundary() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Component />
    </ErrorBoundary>
  )
}

// Handle async errors properly
async function handleSubmit() {
  try {
    setLoading(true)
    await submitData()
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Unknown error')
  } finally {
    setLoading(false)
  }
}
```

### Server-Side Errors
```typescript
// API routes should return consistent error format
export async function POST(request: Request) {
  try {
    // logic
    return Response.json({ data, success: true })
  } catch (error) {
    console.error('API Error:', error)
    return Response.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
```

## 🧪 Testing Standards

### Unit Tests
- Test pure functions and utilities
- Mock external dependencies
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Integration Tests
- Test API routes with real database
- Test component interactions
- Use test database for isolation

### E2E Tests
- Test critical user journeys
- Test multi-tenant scenarios
- Include authentication flows

## 🔄 Git Workflow

### Commit Messages
Use conventional commits format:
```
feat: add user profile management
fix: resolve foreign key display issue
docs: update API documentation
refactor: simplify authentication logic
test: add unit tests for utility functions
```

### Branch Naming
```
feature/user-profile-management
bugfix/foreign-key-display
hotfix/security-vulnerability
docs/api-documentation
```

### Pull Request Guidelines
- Include description of changes
- Reference related issues
- Add screenshots for UI changes
- Ensure all tests pass
- Request appropriate reviewers

## ⚡ Performance Guidelines

### React Performance
- Use React.memo for expensive components
- Implement proper key props
- Avoid inline object/function creation
- Use useCallback and useMemo appropriately

### Database Performance
- Use proper indexes on frequently queried columns
- Implement pagination for large datasets
- Use select() to limit returned columns
- Monitor query performance with EXPLAIN

### Bundle Optimization
- Use dynamic imports for large dependencies
- Implement proper code splitting
- Optimize images with Next.js Image component
- Monitor bundle size with webpack-bundle-analyzer

## 🔒 Security Guidelines

### Authentication
- Never expose service role keys client-side
- Validate JWT tokens server-side
- Implement proper session management
- Use secure cookie settings

### Data Validation
- Validate all inputs with Zod schemas
- Sanitize user-generated content
- Implement rate limiting
- Use parameterized queries

### RLS Security
- Test RLS policies thoroughly
- Audit policy changes
- Use principle of least privilege
- Monitor for policy bypasses

## 📚 Documentation Standards

### Code Documentation
- Add JSDoc comments to all public functions
- Document complex business logic
- Include usage examples
- Keep documentation up-to-date

### API Documentation
- Document all endpoints
- Include request/response examples
- Document error codes
- Maintain OpenAPI specs

## 🚀 Deployment Guidelines

### Environment Management
- Use environment-specific configurations
- Never commit secrets to version control
- Implement proper secret management
- Use different databases for different environments

### Monitoring
- Implement application monitoring
- Set up error tracking
- Monitor database performance
- Create alerting for critical issues

---

## 📞 Getting Help

- Check existing documentation first
- Search closed issues and PRs
- Ask in team channels
- Create detailed bug reports with reproduction steps

Remember: These guidelines exist to maintain code quality and team productivity. When in doubt, prioritize clarity and maintainability over cleverness.
