import dagre from '@dagrejs/dagre'
import type { Position, Relationship, Table } from '@/types/schema'

const NODE_WIDTH = 280
const NODE_HEADER_HEIGHT = 40
const NODE_COLUMN_HEIGHT = 30
const GRID_SIZE = 16

function estimateNodeHeight(table: Table): number {
  return NODE_HEADER_HEIGHT + table.columns.length * NODE_COLUMN_HEIGHT
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

/**
 * Compute a dagre-based top-to-bottom layout for all tables.
 * Returns a Map of tableId -> new position.
 */
export function computeDagreLayout(
  tables: Table[],
  relationships: Relationship[]
): Map<string, Position> {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  for (const table of tables) {
    const height = estimateNodeHeight(table)
    g.setNode(table.id, { width: NODE_WIDTH, height })
  }

  for (const rel of relationships) {
    g.setEdge(rel.source.tableId, rel.target.tableId)
  }

  dagre.layout(g)

  const positions = new Map<string, Position>()
  for (const table of tables) {
    const node = g.node(table.id)
    // dagre returns center coordinates; convert to top-left
    positions.set(table.id, {
      x: snapToGrid(node.x - NODE_WIDTH / 2),
      y: snapToGrid(node.y - node.height / 2),
    })
  }

  return positions
}

/**
 * Find an unoccupied position near the viewport center by spiraling outward.
 */
export function findOpenPosition(
  existingTables: Table[],
  viewportCenter: Position
): Position {
  const stepX = 300
  const stepY = 250

  // Build bounding boxes for existing tables
  const boxes = existingTables.map((t) => ({
    x: t.position.x,
    y: t.position.y,
    w: NODE_WIDTH,
    h: estimateNodeHeight(t),
  }))

  function overlaps(x: number, y: number): boolean {
    const candidateW = NODE_WIDTH
    const candidateH = NODE_HEADER_HEIGHT + NODE_COLUMN_HEIGHT // minimum 1-column height
    for (const box of boxes) {
      if (
        x < box.x + box.w &&
        x + candidateW > box.x &&
        y < box.y + box.h &&
        y + candidateH > box.y
      ) {
        return true
      }
    }
    return false
  }

  // Try center first
  const cx = snapToGrid(viewportCenter.x)
  const cy = snapToGrid(viewportCenter.y)
  if (!overlaps(cx, cy)) return { x: cx, y: cy }

  // Spiral outward
  for (let ring = 1; ring <= 20; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        // Only check the outer ring
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue
        const x = snapToGrid(cx + dx * stepX)
        const y = snapToGrid(cy + dy * stepY)
        if (!overlaps(x, y)) return { x, y }
      }
    }
  }

  // Fallback: offset from center
  return { x: snapToGrid(cx + 400), y: snapToGrid(cy + 400) }
}
