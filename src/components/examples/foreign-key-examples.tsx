"use client"

import { useState } from 'react'
import { ForeignKeyReference } from '@/components/ui/foreign-key-reference'
import { SmartForeignKeyReference } from '@/components/ui/smart-foreign-key-reference'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Example data for demonstration
const exampleUsers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    org_id: '456e7890-e89b-12d3-a456-426614174000',
    role_id: '789e0123-e89b-12d3-a456-426614174000'
  },
  {
    id: '234e5678-e89b-12d3-a456-426614174001',
    name: 'Jane Smith',
    email: 'jane@example.com',
    org_id: '456e7890-e89b-12d3-a456-426614174000',
    role_id: '890e1234-e89b-12d3-a456-426614174001'
  }
]

export function ForeignKeyExamples() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Foreign Key Reference Examples</h1>
      
      {/* Basic Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Usage - View Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Organization Reference:</label>
            <div className="mt-1">
              <ForeignKeyReference
                value="456e7890-e89b-12d3-a456-426614174000"
                referenceTable="system.organizations"
                referenceField="id"
                displayField="org_name"
                mode="view"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">User Reference:</label>
            <div className="mt-1">
              <ForeignKeyReference
                value="123e4567-e89b-12d3-a456-426614174000"
                referenceTable="system.users"
                referenceField="id"
                displayField="email"
                mode="view"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Mode Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Mode with Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Organization:</label>
            <div className="mt-1">
              <ForeignKeyReference
                value={selectedOrg}
                referenceTable="system.organizations"
                referenceField="id"
                displayField="org_name"
                mode="edit"
                onValueChange={setSelectedOrg}
                placeholder="Choose an organization"
              />
            </div>
            {selectedOrg && (
              <div className="mt-2">
                <Badge variant="outline">Selected: {selectedOrg}</Badge>
              </div>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium">Select Role:</label>
            <div className="mt-1">
              <ForeignKeyReference
                value={selectedRole}
                referenceTable="system.roles"
                referenceField="id"
                displayField="role_name"
                mode="edit"
                onValueChange={setSelectedRole}
                placeholder="Choose a role"
              />
            </div>
            {selectedRole && (
              <div className="mt-2">
                <Badge variant="outline">Selected: {selectedRole}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Smart Component Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Component (Config-Driven)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Smart Organization Reference:</label>
            <div className="mt-1">
              <SmartForeignKeyReference
                value="456e7890-e89b-12d3-a456-426614174000"
                referenceTable="system.organizations"
                mode="view"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Smart User Reference:</label>
            <div className="mt-1">
              <SmartForeignKeyReference
                value="123e4567-e89b-12d3-a456-426614174000"
                referenceTable="system.users"
                mode="view"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Integration Example */}
      <Card>
        <CardHeader>
          <CardTitle>Table Integration Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Email</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Organization</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Role</th>
                </tr>
              </thead>
              <tbody>
                {exampleUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">{user.name}</td>
                    <td className="border border-gray-200 px-4 py-2">{user.email}</td>
                    <td className="border border-gray-200 px-4 py-2">
                      <SmartForeignKeyReference
                        value={user.org_id}
                        referenceTable="system.organizations"
                        mode="view"
                      />
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
