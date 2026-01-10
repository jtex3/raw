/**
 * @fileoverview Type Definitions for Foreign Key System
 * 
 * This module defines TypeScript interfaces and types used throughout the
 * foreign key management system in the Raw System application. It provides:
 * - Configuration interfaces for foreign key relationships
 * - Data structures for foreign key records
 * - Mode definitions for different UI states
 * - Generic record interfaces for flexible data handling
 * 
 * These types ensure type safety and consistency across all foreign key
 * components and utilities in the multi-tenant system.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

/**
 * Configuration for a foreign key relationship
 */
export interface ForeignKeyConfig {
  referenceTable: string
  referenceField: string
  displayField: string
}

/**
 * Represents a foreign key reference with display value
 */
export interface ForeignKeyReference {
  id: string
  display: string
}

/**
 * UI mode for foreign key components
 */
export type ForeignKeyMode = 'view' | 'edit'

/**
 * Generic record interface for foreign key data
 */
export interface ForeignKeyRecord {
  [key: string]: any
  id: string
}
