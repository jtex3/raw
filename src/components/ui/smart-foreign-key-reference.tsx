/**
 * @fileoverview Smart Foreign Key Reference Component
 * 
 * This component provides an intelligent wrapper around the ForeignKeyReference
 * component that automatically configures itself based on table relationships.
 * It features:
 * - Automatic configuration lookup from foreign key registry
 * - Simplified API for developers using foreign key references
 * - Error handling for missing configurations
 * - Pass-through of all ForeignKeyReference props
 * 
 * This component reduces boilerplate code and ensures consistent foreign key
 * handling across the application by centralizing configuration management.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

"use client"

import { ForeignKeyReference } from './foreign-key-reference'
import { getForeignKeyConfig } from '@/lib/foreign-key-config'

/**
 * Props for the SmartForeignKeyReference component
 */
interface SmartForeignKeyReferenceProps {
  value: string | null
  referenceTable: string
  mode?: 'view' | 'edit'
  onValueChange?: (value: string | null) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * Smart foreign key reference component with automatic configuration
 * 
 * @param props - Component props
 * @returns JSX element for foreign key reference
 */
export function SmartForeignKeyReference({
  value,
  referenceTable,
  mode = 'view',
  onValueChange,
  className = '',
  placeholder = 'Select a record',
  disabled = false
}: SmartForeignKeyReferenceProps) {
  const config = getForeignKeyConfig(referenceTable)
  
  if (!config) {
    throw new Error(`No configuration found for table: ${referenceTable}`)
  }

  return (
    <ForeignKeyReference
      value={value}
      referenceTable={config.referenceTable}
      referenceField={config.referenceField}
      displayField={config.displayField}
      mode={mode}
      onValueChange={onValueChange}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}
