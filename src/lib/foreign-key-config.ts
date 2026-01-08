import { ForeignKeyConfig } from '@/types/foreign-key'

export const foreignKeyConfigs: Record<string, ForeignKeyConfig> = {
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

export function getForeignKeyConfig(table: string): ForeignKeyConfig | null {
  return foreignKeyConfigs[table] || null
}

export function registerForeignKeyConfig(table: string, config: ForeignKeyConfig): void {
  foreignKeyConfigs[table] = config
}
