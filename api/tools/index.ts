import { createTable, createTableWithColumns, renameTable, deleteTable } from './tables'
import { addColumn, updateColumn, deleteColumn } from './columns'
import {
  addRelationship,
  updateRelationship,
  deleteRelationship,
  generateJunctionTable,
} from './relationships'
import { undo, redo } from './history'

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
