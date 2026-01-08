export interface ForeignKeyConfig {
  referenceTable: string
  referenceField: string
  displayField: string
}

export interface ForeignKeyReference {
  id: string
  display: string
}

export type ForeignKeyMode = 'view' | 'edit'

export interface ForeignKeyRecord {
  [key: string]: any
  id: string
}
