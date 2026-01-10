/**
 * @fileoverview Centralized Type Definitions
 * 
 * This module contains all shared TypeScript interfaces and types used throughout
 * the Raw System application. It provides type safety and consistency across
 * components, pages, and utilities.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

// =====================================================
// DATABASE ENTITY TYPES
// =====================================================

/**
 * Organization entity representing a tenant in the multi-tenant system
 */
export interface Organization {
  id: string
  name: string
  org_name: string
  subdomain: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * User entity with organization and role associations
 */
export interface User {
  id: string
  name: string
  org_id: string
  profile_id: string
  role_id: string | null
  email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Role entity for hierarchical access control
 */
export interface Role {
  id: string
  name: string
  org_id: string
  role_name: string
  parent_role_id: string | null
  level: number | null
  created_at: string
}

/**
 * Profile entity for permission templates
 */
export interface Profile {
  id: string
  name: string
  org_id: string
  profile_name: string
  description: string | null
  created_at: string
}

/**
 * Object-level permission configuration
 */
export interface ProfileObjectPermission {
  id: string
  name: string
  profile_id: string
  object_name: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
  created_at: string
}

/**
 * Field-level permission configuration
 */
export interface ProfileFieldPermission {
  id: string
  name: string
  profile_id: string
  object_name: string
  field_name: string
  can_read: boolean
  can_edit: boolean
  created_at: string
}

// =====================================================
// SCHEMA AND METADATA TYPES
// =====================================================

/**
 * Database table metadata from schema discovery
 * Includes permission flags based on user's profile_object_permissions
 */
export interface SchemaTable {
  table_name: string
  table_type: string
  record_count?: number
  can_create?: boolean
  can_read?: boolean
  can_update?: boolean
  can_delete?: boolean
}

/**
 * Database column metadata
 */
export interface TableColumn {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

/**
 * Foreign key relationship metadata
 */
export interface ForeignKeyRelation {
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
}

// =====================================================
// UI COMPONENT TYPES
// =====================================================

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

/**
 * Form field validation state
 */
export interface FieldValidation {
  isValid: boolean
  errorMessage: string | null
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrevious: boolean
}

// =====================================================
// PERMISSION AND SECURITY TYPES
// =====================================================

/**
 * Permission types for object access
 */
export type PermissionType = 'create' | 'read' | 'update' | 'delete'

/**
 * Field permission types
 */
export type FieldPermissionType = 'read' | 'edit'

/**
 * Organization-wide default access levels
 */
export type AccessLevel = 'private' | 'public_read_only' | 'public_read_write'

/**
 * Sharing rule access levels
 */
export type SharingAccessLevel = 'read' | 'read_write'

/**
 * Sharing rule types
 */
export type SharingRuleType = 'criteria_based' | 'ownership_based'

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Generic record type for dynamic data
 */
export type GenericRecord = Record<string, unknown>

/**
 * Database operation result
 */
export interface DatabaseResult<T> {
  data: T | null
  error: Error | null
  count?: number
}

/**
 * Search and filter configuration
 */
export interface SearchConfig {
  query: string
  filters: Record<string, unknown>
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

/**
 * Component size variants
 */
export type ComponentSize = 'sm' | 'md' | 'lg'

/**
 * Component variant types
 */
export type ComponentVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'

// =====================================================
// AUTHENTICATION TYPES
// =====================================================

/**
 * JWT app metadata structure
 */
export interface AppMetadata {
  org_id: string
  profile_id: string
  provider?: string
  providers?: string[]
}

/**
 * Authentication session data
 */
export interface AuthSession {
  user: {
    id: string
    email: string
    app_metadata: AppMetadata
  }
  access_token: string
  refresh_token: string
  expires_at: number
}

// =====================================================
// FORM TYPES
// =====================================================

/**
 * Generic form field configuration
 */
export interface FormField {
  name: string
  type: 'text' | 'email' | 'password' | 'number' | 'boolean' | 'select' | 'textarea'
  label: string
  placeholder?: string
  required: boolean
  validation?: FieldValidation
}

/**
 * Form submission state
 */
export interface FormState {
  isSubmitting: boolean
  errors: Record<string, string>
  touched: Record<string, boolean>
}
