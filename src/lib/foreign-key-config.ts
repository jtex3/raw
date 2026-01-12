/**
 * @fileoverview Foreign Key Configuration Registry
 * 
 * This module manages the configuration for foreign key relationships in the Raw System.
 * It provides:
 * - Centralized foreign key mapping configuration
 * - Display field specifications for each table
 * - Reference table and field definitions
 * - Helper functions for foreign key management
 * 
 * The configuration supports the multi-tenant Salesforce-like architecture with
 * proper relationship handling between organizations, users, roles, profiles,
 * permissions, and other system entities.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

import { ForeignKeyConfig } from '@/types/foreign-key'

/**
 * Registry of foreign key configurations for all system tables
 * Maps table names to their foreign key display configurations
 */
export const foreignKeyConfigs: Record<string, ForeignKeyConfig> = {
  'business.entity': {
    referenceTable: 'business.entity',
    referenceField: 'id',
    displayField: 'name'
  },
  'business.entity_junction': {
    referenceTable: 'business.entity_junction',
    referenceField: 'id',
    displayField: 'name'
  },
  'system.organizations': {
    referenceTable: 'system.organizations',
    referenceField: 'id',
    displayField: 'org_name'
  },
  'system.users': {
    referenceTable: 'system.users',
    referenceField: 'id',
    displayField: 'email'
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
  },
  'system.profile_object_permissions': {
    referenceTable: 'system.profile_object_permissions',
    referenceField: 'id',
    displayField: 'object_name'
  },
  'system.profile_field_permissions': {
    referenceTable: 'system.profile_field_permissions',
    referenceField: 'id',
    displayField: 'field_name'
  },
  'system.org_wide_defaults': {
    referenceTable: 'system.org_wide_defaults',
    referenceField: 'id',
    displayField: 'object_name'
  },
  'system.sharing_rules': {
    referenceTable: 'system.sharing_rules',
    referenceField: 'id',
    displayField: 'rule_name'
  },
  'system.manual_shares': {
    referenceTable: 'system.manual_shares',
    referenceField: 'id',
    displayField: 'access_level'
  },
  'system.list_views': {
    referenceTable: 'system.list_views',
    referenceField: 'id',
    displayField: 'view_name'
  }
}

export function getForeignKeyConfig(table: string): ForeignKeyConfig | null {
  return foreignKeyConfigs[table] || null
}

export function registerForeignKeyConfig(table: string, config: ForeignKeyConfig): void {
  foreignKeyConfigs[table] = config
}
