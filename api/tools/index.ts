import {
  createTable,
  createTableWithColumns,
  createMultipleTables,
  renameTable,
  deleteTable,
} from './tables.js'
import { addColumn, updateColumn, deleteColumn } from './columns.js'
import {
  addRelationship,
  addMultipleRelationships,
  updateRelationship,
  deleteRelationship,
  generateJunctionTable,
} from './relationships.js'
import { resetSchema } from './canvas.js'
import { undo, redo } from './history.js'

export const tools = {
  createTable,
  createTableWithColumns,
  createMultipleTables,
  renameTable,
  deleteTable,
  addColumn,
  updateColumn,
  deleteColumn,
  addRelationship,
  addMultipleRelationships,
  updateRelationship,
  deleteRelationship,
  generateJunctionTable,
  resetSchema,
  undo,
  redo,
}
