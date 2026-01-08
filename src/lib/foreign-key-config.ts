import { ForeignKeyConfig } from '@/types/foreign-key'

export const foreignKeyConfigs: Record<string, ForeignKeyConfig> = {
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
