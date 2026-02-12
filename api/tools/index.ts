import { createTable, createTableWithColumns, renameTable, deleteTable } from './tables.ts'
import { addColumn, updateColumn, deleteColumn } from './columns.ts'
import {
  addRelationship,
  updateRelationship,
  deleteRelationship,
  generateJunctionTable,
} from './relationships.ts'
import { undo, redo } from './history.ts'

export const tools = {
  createTable,
  createTableWithColumns,
  renameTable,
  deleteTable,
  addColumn,
  updateColumn,
  deleteColumn,
  addRelationship,
  updateRelationship,
  deleteRelationship,
  generateJunctionTable,
  undo,
  redo,
}
