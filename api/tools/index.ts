import { addColumn, deleteColumn, updateColumn } from '@api/tools/columns'
import {
  createTable,
  createTableWithColumns,
  deleteTable,
  renameTable,
} from '@api/tools/tables'
import { redo, undo } from './history'
import {
  addRelationship,
  deleteRelationship,
  generateJunctionTable,
  updateRelationship,
} from './relationships'

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
