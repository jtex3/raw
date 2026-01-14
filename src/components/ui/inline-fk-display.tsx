/**
 * @fileoverview Inline Foreign Key Display Component
 *
 * Simple display component for foreign key values.
 * Receives pre-fetched data via props to avoid client-side fetching flicker.
 */

"use client"

import Link from 'next/link'

interface InlineFkDisplayProps {
  value: string | null
  displayValue: string
  referenceTable: string
  className?: string
}

export function InlineFkDisplay({
  value,
  displayValue,
  referenceTable,
  className = ''
}: InlineFkDisplayProps) {
  // Parse reference table to extract schema and table name
  const [schema, tableName] = referenceTable.includes('.')
    ? referenceTable.split('.')
    : ['system', referenceTable]

  if (!value || !displayValue) {
    return <span className="text-gray-400 italic">NULL</span>
  }

  return (
    <Link
      href={`/objects/${schema}/${tableName}/records/${value}/view`}
      className={`text-teal-600 hover:text-teal-700 hover:underline font-medium ${className}`}
      title={`View ${displayValue}`}
    >
      {displayValue}
    </Link>
  )
}
