# Foreign Key Reference Component

A Salesforce-like component that displays user-friendly names instead of UUID foreign keys for any parent-child relationship in your Next.js + Supabase application.

## Features

- **Generic Solution**: Works with any table/field combination
- **View & Edit Modes**: Display-only or interactive selection
- **Search Functionality**: Real-time search with debouncing
- **Type Safety**: Full TypeScript support
- **Performance Optimized**: Efficient data fetching and caching
- **Error Handling**: Comprehensive error states
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-friendly with Tailwind CSS

## Components

### 1. ForeignKeyReference (Main Component)

The core component that handles foreign key display and selection.

```tsx
import { ForeignKeyReference } from '@/components/ui/foreign-key-reference'

<ForeignKeyReference
  value={userId}
  referenceTable="system.users"
  referenceField="id"
  displayField="email"
  mode="view"
/>
```

### 2. SmartForeignKeyReference (Config-Driven)

Enhanced component that uses predefined configurations.

```tsx
import { SmartForeignKeyReference } from '@/components/ui/smart-foreign-key-reference'

<SmartForeignKeyReference
  value={orgId}
  referenceTable="system.organizations"
  mode="edit"
  onValueChange={setOrgId}
/>
```

### 3. useForeignKey Hook

Custom hook for data fetching and state management.

```tsx
import { useForeignKey } from '@/hooks/use-foreign-key'

const { displayValue, isLoading, error } = useForeignKey(userId, {
  referenceTable: 'system.users',
  referenceField: 'id',
  displayField: 'email'
})
```

## Configuration

### Predefined Configurations

The system comes with predefined configurations for common tables:

```typescript
// src/lib/foreign-key-config.ts
export const foreignKeyConfigs = {
  'system.users': {
    referenceTable: 'system.users',
    referenceField: 'id',
    displayField: 'email'
  },
  'system.organizations': {
    referenceTable: 'system.organizations',
    referenceField: 'id',
    displayField: 'org_name'
  },
  'system.roles': {
    referenceTable: 'system.roles',
    referenceField: 'id',
    displayField: 'role_name'
  },
  'system.profiles': {
    referenceTable: 'system.profiles',
    referenceField: 'id',
    displayField: 'profile_name'
  }
}
```

### Adding New Configurations

```tsx
import { registerForeignKeyConfig } from '@/lib/foreign-key-config'

registerForeignKeyConfig('custom.table', {
  referenceTable: 'custom.table',
  referenceField: 'id',
  displayField: 'name'
})
```

## Usage Examples

### Basic View Mode

```tsx
function UserProfile({ userId }: { userId: string }) {
  return (
    <div>
      <label>Reports To:</label>
      <ForeignKeyReference
        value={userId}
        referenceTable="system.users"
        referenceField="id"
        displayField="email"
        mode="view"
      />
    </div>
  )
}
```

### Edit Mode with Search

```tsx
function OrganizationEditor({ orgId, onChange }: { 
  orgId: string | null
  onChange: (id: string | null) => void 
}) {
  return (
    <ForeignKeyReference
      value={orgId}
      referenceTable="system.organizations"
      referenceField="id"
      displayField="org_name"
      mode="edit"
      onValueChange={onChange}
      placeholder="Select an organization"
    />
  )
}
```

### Table Integration

```tsx
function UserTable({ users }: { users: any[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Organization</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>
              <SmartForeignKeyReference
                value={user.org_id}
                referenceTable="system.organizations"
                mode="view"
              />
            </td>
            <td>
              <SmartForeignKeyReference
                value={user.role_id}
                referenceTable="system.roles"
                mode="view"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Props Reference

### ForeignKeyReferenceProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| null` | - | The UUID foreign key value |
| `referenceTable` | `string` | - | Table containing the referenced record |
| `referenceField` | `string` | - | Field name of the primary key |
| `displayField` | `string` | - | Field name to display to users |
| `mode` | `'view' \| 'edit'` | `'view'` | Display or edit mode |
| `onValueChange` | `(value: string \| null) => void` | - | Callback for value changes |
| `className` | `string` | `''` | Additional CSS classes |
| `placeholder` | `string` | `'Select a record'` | Placeholder text for edit mode |
| `disabled` | `boolean` | `false` | Disable the component |

### SmartForeignKeyReferenceProps

Same as `ForeignKeyReferenceProps` but excludes `referenceField` and `displayField` as they're pulled from configuration.

## Styling

The component uses Tailwind CSS classes and integrates with your existing design system:

- **Badge variants**: `secondary`, `outline`, `destructive`
- **Button variants**: `outline`, `sm` size
- **Responsive design**: Mobile-first approach
- **Theme support**: Follows your color scheme

## Performance Considerations

1. **Debounced Search**: 300ms delay to reduce API calls
2. **Result Limiting**: Maximum 10 search results
3. **Efficient Queries**: Single field selection for display values
4. **Component Caching**: React.memo for expensive components
5. **Lazy Loading**: Only fetches when needed

## Error Handling

The component handles various error states:

- **Network errors**: Shows "Error" badge
- **No results**: Displays "No results found"
- **Loading states**: Shows "Loading..." with animation
- **Invalid references**: Shows "No reference"

## Accessibility

- **Keyboard navigation**: Full keyboard support
- **Screen reader support**: Proper ARIA labels
- **Focus management**: Logical tab order
- **High contrast**: Follows WCAG guidelines

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── foreign-key-reference.tsx      # Main component
│   │   └── smart-foreign-key-reference.tsx # Config-driven version
│   └── examples/
│       └── foreign-key-examples.tsx      # Usage examples
├── hooks/
│   └── use-foreign-key.ts                # Custom hook
├── lib/
│   └── foreign-key-config.ts             # Configuration registry
└── types/
    └── foreign-key.ts                    # Type definitions
```

## Best Practices

1. **Use Smart Component**: Prefer `SmartForeignKeyReference` for consistency
2. **Configure Once**: Set up configurations in a central location
3. **Handle Loading**: Always show loading states for better UX
4. **Error Boundaries**: Wrap components in error boundaries
5. **Test Thoroughly**: Test both view and edit modes

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure proper type casting for Supabase responses
2. **Missing Config**: Add table configuration to `foreign-key-config.ts`
3. **Permission Errors**: Check RLS policies on referenced tables
4. **Performance**: Add indexes on frequently searched fields

### Debug Mode

Enable debug logging by setting:

```tsx
// In development
console.log('Foreign Key Debug:', { value, referenceTable, displayValue })
```

This component provides a complete solution for displaying user-friendly foreign key references in your Salesforce-like application.
