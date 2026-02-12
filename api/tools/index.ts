import { createTable, createTableWithColumns, renameTable, deleteTable } from './tables.js'
import { addColumn, updateColumn, deleteColumn } from './columns.js'
import {
  addRelationship,
  updateRelationship,
  deleteRelationship,
  generateJunctionTable,
} from './relationships.js'
import { undo, redo } from './history.js'

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
