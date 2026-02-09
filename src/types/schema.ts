export const ColumnType = {
  VARCHAR: "VARCHAR",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  TEXT: "TEXT",
  TIMESTAMP: "TIMESTAMP",
} as const;
export type ColumnType = (typeof ColumnType)[keyof typeof ColumnType];

export const ColumnConstraint = {
  PRIMARY_KEY: "PRIMARY KEY",
  NOT_NULL: "NOT NULL",
  UNIQUE: "UNIQUE",
} as const;
export type ColumnConstraint =
  (typeof ColumnConstraint)[keyof typeof ColumnConstraint];

export const RelationshipType = {
  ONE_TO_ONE: "one-to-one",
  ONE_TO_MANY: "one-to-many",
  MANY_TO_MANY: "many-to-many",
} as const;
export type RelationshipType =
  (typeof RelationshipType)[keyof typeof RelationshipType];

export interface Position {
  x: number;
  y: number;
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  constraints: ColumnConstraint[];
}

export interface Table {
  id: string;
  name: string;
  position: Position;
  columns: Column[];
}

export interface RelationshipEndpoint {
  tableId: string;
  columnId: string;
}

export interface Relationship {
  id: string;
  source: RelationshipEndpoint;
  target: RelationshipEndpoint;
  type: RelationshipType;
}

export interface Schema {
  version: number;
  tables: Table[];
  relationships: Relationship[];
}

export interface SchemaMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export interface SavedSchema {
  meta: SchemaMeta;
  schema: Schema;
}

export interface ValidationError {
  type: "error" | "warning";
  tableId?: string;
  columnId?: string;
  relationshipId?: string;
  message: string;
}
