import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useSchemaStore } from '@/hooks/useSchemaStore'
import { ColumnType } from '@/types/schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ColumnRow } from './ColumnRow'
import { ConfirmDelete } from './ConfirmDelete'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

export function TableEditor() {
  const schema = useSchemaStore((s) => s.schema)
  const selectedTableId = useSchemaStore((s) => s.selectedTableId)
  const updateTable = useSchemaStore((s) => s.updateTable)
  const addColumn = useSchemaStore((s) => s.addColumn)
  const updateColumn = useSchemaStore((s) => s.updateColumn)
  const removeColumn = useSchemaStore((s) => s.removeColumn)
  const reorderColumns = useSchemaStore((s) => s.reorderColumns)
  const removeTable = useSchemaStore((s) => s.removeTable)
  const selectTable = useSchemaStore((s) => s.selectTable)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const table = selectedTableId
    ? schema.tables.find((t) => t.id === selectedTableId)
    : null

  if (!table) return null

  const handleAddColumn = () => {
    addColumn(table.id, {
      name: `column_${table.columns.length + 1}`,
      type: ColumnType.VARCHAR,
      constraints: [],
    })
  }

  const handleDeleteTable = () => {
    removeTable(table.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = table.columns.findIndex((col) => col.id === active.id)
      const newIndex = table.columns.findIndex((col) => col.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderColumns(table.id, oldIndex, newIndex)
      }
    }
  }

  return (
    <div
      className={cn(
        'bg-card absolute top-0 right-0 z-20 flex h-full w-[320px] flex-col border-l font-mono shadow-lg',
        'animate-in slide-in-from-right duration-200'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          Table
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close table editor"
          className="text-muted-foreground hover:text-foreground size-6"
          onClick={() => selectTable(null)}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Table name */}
        <div className="px-3 pt-3 pb-2">
          <Label
            htmlFor="table-name"
            className="text-muted-foreground mb-1.5 text-[10px] tracking-wider uppercase"
          >
            Name
          </Label>
          <Input
            id="table-name"
            autoComplete="off"
            value={table.name}
            onChange={(e) => updateTable(table.id, { name: e.target.value })}
            className="h-8 font-mono text-sm font-semibold shadow-none"
          />
        </div>

        <Separator />

        {/* Columns */}
        <div className="px-3 pt-2 pb-1">
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-muted-foreground text-[10px] tracking-wider uppercase">
              Columns
            </Label>
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {table.columns.length}
            </span>
          </div>

          {table.columns.length === 0 ? (
            <div className="text-muted-foreground py-4 text-center text-[11px] italic">
              No columns yet
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={table.columns.map((col) => col.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-border/50 divide-y">
                  {table.columns.map((col) => (
                    <ColumnRow
                      key={col.id}
                      column={col}
                      onUpdate={(columnId, updates) =>
                        updateColumn(table.id, columnId, updates)
                      }
                      onRemove={(columnId) => removeColumn(table.id, columnId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full gap-1.5 text-xs"
            onClick={handleAddColumn}
          >
            <PlusIcon className="size-3" />
            Add Column
          </Button>
        </div>
      </div>

      {/* Footer — delete table */}
      <div className="border-t p-3">
        <ConfirmDelete
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive w-full gap-1.5"
            >
              <Trash2Icon className="size-3" />
              Delete Table
            </Button>
          }
          title="Delete table?"
          description={
            <>
              Table <strong className="font-mono">{table.name}</strong> and all
              its columns will be permanently removed. Any relationships
              involving this table will also be deleted.
            </>
          }
          onConfirm={handleDeleteTable}
        />
      </div>
    </div>
  )
}
