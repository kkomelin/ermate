import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { KeyRoundIcon } from 'lucide-react'
import type { Table } from '@/types/schema'
import { ColumnConstraint } from '@/types/schema'
import { cn } from '@/lib/utils'

export interface TableNodeData {
  table: Table
  selected: boolean
  onSelect: (tableId: string) => void
  [key: string]: unknown
}

const TYPE_COLORS: Record<string, string> = {
  INTEGER: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  VARCHAR: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  TEXT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  BOOLEAN: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  TIMESTAMP: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
}

const CONSTRAINT_BADGE: Record<string, { label: string; className: string }> = {
  'PRIMARY KEY': {
    label: 'PK',
    className: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  },
  'FOREIGN KEY': {
    label: 'FK',
    className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  },
  'NOT NULL': {
    label: 'NN',
    className: 'bg-muted text-muted-foreground',
  },
  UNIQUE: {
    label: 'UQ',
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
}

function TableNodeComponent({ data }: NodeProps) {
  const { table, selected, onSelect } = data as unknown as TableNodeData

  return (
    <div
      className={cn(
        'bg-card min-w-[220px] rounded-lg border font-mono text-[13px] shadow-md transition-shadow select-none',
        selected
          ? 'border-primary ring-primary/25 shadow-lg ring-2'
          : 'border-border hover:shadow-lg'
      )}
      onClick={() => onSelect(table.id)}
    >
      {/* Table header */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-t-lg border-b px-3 py-2',
          selected
            ? 'bg-primary/10 dark:bg-primary/5'
            : 'bg-muted/50 dark:bg-muted/30'
        )}
      >
        <span className="text-card-foreground truncate font-semibold">
          {table.name}
        </span>
        <span className="text-muted-foreground ml-auto text-[10px] tabular-nums">
          {table.columns.length} col{table.columns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Columns */}
      <div className="relative">
        {table.columns.length === 0 ? (
          <div className="text-muted-foreground px-3 py-3 text-center text-[11px] italic">
            No columns
          </div>
        ) : (
          table.columns.map((col, idx) => {
            const isPk = col.constraints.includes(ColumnConstraint.PRIMARY_KEY)
            const isFk = col.constraints.includes(ColumnConstraint.FOREIGN_KEY)

            return (
              <div
                key={col.id}
                className={cn(
                  'group relative flex items-center gap-1.5 px-3 py-1.5',
                  idx !== table.columns.length - 1 &&
                    'border-border/50 border-b',
                  isPk && 'bg-amber-500/[0.04] dark:bg-amber-500/[0.03]',
                  isFk &&
                    !isPk &&
                    'bg-purple-500/[0.03] dark:bg-purple-500/[0.02]'
                )}
              >
                {/* Target handle — left side */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${col.id}-target`}
                  className="!border-card !bg-muted-foreground/40 group-hover:!bg-primary !-left-[5px] !h-2.5 !w-2.5 !rounded-full !border-2 transition-colors"
                />

                {/* PK icon */}
                {isPk && (
                  <KeyRoundIcon className="size-3 shrink-0 text-amber-500" />
                )}

                {/* FK icon */}
                {isFk && !isPk && (
                  <KeyRoundIcon className="size-3 shrink-0 text-purple-500" />
                )}

                {/* Column name */}
                <span
                  className={cn(
                    'min-w-0 shrink truncate',
                    isPk || isFk
                      ? 'text-card-foreground font-semibold'
                      : 'text-card-foreground/80'
                  )}
                >
                  {col.name}
                </span>

                {/* Type badge */}
                <span
                  className={cn(
                    'ml-auto shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-medium',
                    TYPE_COLORS[col.type] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {col.type}
                </span>

                {/* Constraint badges */}
                {col.constraints
                  .filter(
                    (c) =>
                      c !== ColumnConstraint.PRIMARY_KEY &&
                      c !== ColumnConstraint.FOREIGN_KEY
                  )
                  .map((constraint) => {
                    const badge = CONSTRAINT_BADGE[constraint]
                    if (!badge) return null
                    return (
                      <span
                        key={constraint}
                        className={cn(
                          'shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-medium',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    )
                  })}

                {/* Source handle — right side */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${col.id}-source`}
                  className="!border-card !bg-muted-foreground/40 group-hover:!bg-primary !-right-[5px] !h-2.5 !w-2.5 !rounded-full !border-2 transition-colors"
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export const TableNode = memo(TableNodeComponent)
