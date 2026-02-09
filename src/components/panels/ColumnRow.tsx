import { GripVerticalIcon, Trash2Icon } from 'lucide-react'
import type { Column, ColumnConstraint, ColumnType } from '@/types/schema'
import { ColumnType as CT, ColumnConstraint as CC } from '@/types/schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDelete } from './ConfirmDelete'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo } from 'react'

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: CT.VARCHAR, label: 'VARCHAR' },
  { value: CT.INTEGER, label: 'INTEGER' },
  { value: CT.BOOLEAN, label: 'BOOLEAN' },
  { value: CT.TEXT, label: 'TEXT' },
  { value: CT.TIMESTAMP, label: 'TIMESTAMP' },
]

const TYPE_COLORS: Record<string, string> = {
  INTEGER: 'text-blue-600 dark:text-blue-400',
  VARCHAR: 'text-amber-600 dark:text-amber-400',
  TEXT: 'text-emerald-600 dark:text-emerald-400',
  BOOLEAN: 'text-violet-600 dark:text-violet-400',
  TIMESTAMP: 'text-rose-600 dark:text-rose-400',
}

const CONSTRAINT_TOGGLES: {
  value: ColumnConstraint
  label: string
  activeClass: string
}[] = [
  {
    value: CC.PRIMARY_KEY,
    label: 'PK',
    activeClass:
      'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
  },
  {
    value: CC.FOREIGN_KEY,
    label: 'FK',
    activeClass:
      'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40',
  },
  {
    value: CC.NOT_NULL,
    label: 'NN',
    activeClass: 'bg-muted text-foreground border-border',
  },
  {
    value: CC.UNIQUE,
    label: 'UQ',
    activeClass:
      'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40',
  },
]

interface ColumnRowProps {
  column: Column
  onUpdate: (
    columnId: string,
    updates: Partial<Pick<Column, 'name' | 'type' | 'constraints'>>
  ) => void
  onRemove: (columnId: string) => void
}

function ColumnRowComponent({ column, onUpdate, onRemove }: ColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const toggleConstraint = (constraint: ColumnConstraint) => {
    const has = column.constraints.includes(constraint)
    const updated = has
      ? column.constraints.filter((c) => c !== constraint)
      : [...column.constraints, constraint]
    onUpdate(column.id, { constraints: updated })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1.5 py-1.5',
        isDragging && 'opacity-50'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="text-muted-foreground/40 hover:text-muted-foreground focus-visible:text-foreground focus-visible:outline-primary shrink-0 cursor-grab touch-none rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>

      {/* Column name */}
      <Input
        value={column.name}
        onChange={(e) => onUpdate(column.id, { name: e.target.value })}
        aria-label="Column name"
        autoComplete="off"
        className="focus-visible:border-border focus-visible:bg-background h-7 flex-1 rounded-sm border-transparent bg-transparent px-1.5 font-mono text-xs shadow-none transition-colors"
        placeholder="column_name"
      />

      {/* Type selector */}
      <Select
        value={column.type}
        onValueChange={(val) =>
          onUpdate(column.id, { type: val as ColumnType })
        }
      >
        <SelectTrigger
          className={cn(
            'focus-visible:border-border h-7 w-[88px] shrink-0 rounded-sm border-transparent bg-transparent px-1.5 font-mono text-[10px] font-medium shadow-none transition-colors',
            TYPE_COLORS[column.type]
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="font-mono text-xs">
          {COLUMN_TYPES.map((t) => (
            <SelectItem
              key={t.value}
              value={t.value}
              className={cn('text-xs', TYPE_COLORS[t.value])}
            >
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Constraint toggles */}
      <div className="flex shrink-0 gap-0.5">
        {CONSTRAINT_TOGGLES.map((ct) => {
          const active = column.constraints.includes(ct.value)
          return (
            <button
              key={ct.value}
              type="button"
              aria-label={ct.value}
              aria-pressed={active}
              onClick={() => toggleConstraint(ct.value)}
              className={cn(
                'h-5 rounded-sm border px-1 font-mono text-[9px] leading-none font-semibold transition-all',
                active
                  ? ct.activeClass
                  : 'text-muted-foreground/40 hover:border-border hover:text-muted-foreground border-transparent'
              )}
            >
              {ct.label}
            </button>
          )
        })}
      </div>

      {/* Delete */}
      <ConfirmDelete
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground/40 hover:text-destructive size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2Icon className="size-3" />
          </Button>
        }
        title="Delete column?"
        description={
          <>
            Column <strong className="font-mono">{column.name}</strong> will be
            permanently removed. Any relationships using this column will also
            be deleted.
          </>
        }
        onConfirm={() => onRemove(column.id)}
      />
    </div>
  )
}

export const ColumnRow = memo(ColumnRowComponent)
