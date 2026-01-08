"use client"

import { ForeignKeyReference } from './foreign-key-reference'
import { getForeignKeyConfig } from '@/lib/foreign-key-config'

interface SmartForeignKeyReferenceProps {
  value: string | null
  referenceTable: string
  mode?: 'view' | 'edit'
  onValueChange?: (value: string | null) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

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
