import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useSchemaStore } from '@/hooks/useSchemaStore'
import { ColumnType } from '@/types/schema'
import type { Column } from '@/types/schema'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ColumnRow } from './ColumnRow'
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
import { useCallback, useMemo, memo } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

/** Isolated table name input — re-renders on keystrokes without touching the column list. */
const TableNameInput = memo(function TableNameInput({
  tableId,
  name,
}: {
  tableId: string
  name: string
}) {
  const updateTable = useSchemaStore((s) => s.updateTable)

  const handleCommit = useCallback(
    (value: string) => updateTable(tableId, { name: value }),
    [updateTable, tableId]
  )

  const [localName, setLocalName] = useDebouncedValue(name, handleCommit)

  return (
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
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        className="h-8 font-mono text-sm font-semibold shadow-none"
      />
    </div>
  )
})

export function TableEditor() {
  const schema = useSchemaStore((s) => s.schema)
  const selectedTableId = useSchemaStore((s) => s.selectedTableId)
  const addColumn = useSchemaStore((s) => s.addColumn)
  const updateColumn = useSchemaStore((s) => s.updateColumn)
  const removeColumn = useSchemaStore((s) => s.removeColumn)
  const reorderColumns = useSchemaStore((s) => s.reorderColumns)
  const removeTable = useSchemaStore((s) => s.removeTable)
  const selectTable = useSchemaStore((s) => s.selectTable)

  const table = selectedTableId
    ? schema.tables.find((t) => t.id === selectedTableId)
    : null

  // All hooks must be called before any conditional returns
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columnIds = useMemo(
    () => table?.columns.map((col) => col.id) ?? [],
    [table?.columns]
  )

  const handleAddColumn = useCallback(() => {
    if (!selectedTableId) return
    const t = useSchemaStore
      .getState()
      .schema.tables.find((t) => t.id === selectedTableId)
    if (!t) return
    addColumn(selectedTableId, {
      name: `column_${t.columns.length + 1}`,
      type: ColumnType.VARCHAR,
      constraints: [],
    })
  }, [addColumn, selectedTableId])

  const handleDeleteTable = useCallback(() => {
    if (!selectedTableId) return
    removeTable(selectedTableId)
  }, [removeTable, selectedTableId])

  const handleUpdateColumn = useCallback(
    (
      columnId: string,
      updates: Partial<Pick<Column, 'name' | 'type' | 'constraints'>>
    ) => {
      if (!selectedTableId) return
      updateColumn(selectedTableId, columnId, updates)
    },
    [updateColumn, selectedTableId]
  )

  const handleRemoveColumn = useCallback(
    (columnId: string) => {
      if (!selectedTableId) return
      removeColumn(selectedTableId, columnId)
    },
    [removeColumn, selectedTableId]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!selectedTableId) return
      const { active, over } = event

      if (over && active.id !== over.id) {
        const cols = useSchemaStore
          .getState()
          .schema.tables.find((t) => t.id === selectedTableId)?.columns
        if (!cols) return
        const oldIndex = cols.findIndex((col) => col.id === active.id)
        const newIndex = cols.findIndex((col) => col.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          reorderColumns(selectedTableId, oldIndex, newIndex)
        }
      }
    },
    [reorderColumns, selectedTableId]
  )

  // Early return must come AFTER all hooks
  if (!table) return null

  return (
    <div
      className={cn(
        'bg-card absolute top-0 right-0 z-20 flex h-full w-[320px] flex-col border-l font-mono shadow-lg md:w-[340px] lg:w-[370px]',
        'motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-200'
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
        <TableNameInput tableId={table.id} name={table.name} />

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
                items={columnIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-border/50 divide-y">
                  {table.columns.map((col) => (
                    <ColumnRow
                      key={col.id}
                      column={col}
                      onUpdate={handleUpdateColumn}
                      onRemove={handleRemoveColumn}
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
        <Button
          variant="outline"
          size="sm"
          aria-label="Delete table"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive w-full gap-1.5"
          onClick={handleDeleteTable}
        >
          <Trash2Icon className="size-3" />
          Delete Table
        </Button>
      </div>
    </div>
  )
}
