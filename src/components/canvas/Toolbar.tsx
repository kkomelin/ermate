import { LoadDialog } from '@/components/panels/LoadDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLogBarStore } from '@/hooks/useLogBarStore'
import { useSchemaStore, useTemporalStore } from '@/hooks/useSchemaStore'
import { useShareUrl } from '@/hooks/useShareUrl'
import { useValidation } from '@/hooks/useValidation'
import {
  downloadAsJSON,
  downloadAsSQL,
  importFromFile,
} from '@/services/export-import'
import { ColumnConstraint, ColumnType } from '@/types/schema'
import { useReactFlow } from '@xyflow/react'
import {
  DownloadIcon,
  FilePlusIcon,
  FolderOpenIcon,
  MenuIcon,
  PencilIcon,
  Redo2Icon,
  Share2Icon,
  ShieldCheckIcon,
  SquarePlusIcon,
  TableIcon,
  Undo2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

export function Toolbar() {
  const addTable = useSchemaStore((s) => s.addTable)
  const addTableWithColumns = useSchemaStore((s) => s.addTableWithColumns)
  const schema = useSchemaStore((s) => s.schema)
  const schemaName = useSchemaStore((s) => s.schemaName)
  const setSchemaName = useSchemaStore((s) => s.setSchemaName)
  const setSchema = useSchemaStore((s) => s.setSchema)
  const newSchema = useSchemaStore((s) => s.newSchema)
  const { getViewport } = useReactFlow()
  const { copyShareUrl } = useShareUrl()
  const pastStates = useTemporalStore((s) => s.pastStates)
  const futureStates = useTemporalStore((s) => s.futureStates)
  const undo = useTemporalStore((s) => s.undo)
  const redo = useTemporalStore((s) => s.redo)
  const toggleLogBar = useLogBarStore((s) => s.toggle)
  const { errorCount } = useValidation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setEditValue(schemaName)
    setEditing(true)
    requestAnimationFrame(() => nameInputRef.current?.select())
  }

  function commitName() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== schemaName) {
      setSchemaName(trimmed)
    }
    setEditing(false)
  }

  const handleAddTable = useCallback(() => {
    const { x, y, zoom } = getViewport()
    const centerX = (-x + window.innerWidth / 2) / zoom
    const centerY = (-y + window.innerHeight / 2) / zoom
    const offsetX = (Math.random() - 0.5) * 100
    const offsetY = (Math.random() - 0.5) * 100

    addTable(`table_${Date.now()}`, {
      x: Math.round(centerX + offsetX),
      y: Math.round(centerY + offsetY),
    })
  }, [addTable, getViewport])

  const handleAddSampleTable = useCallback(() => {
    const { x, y, zoom } = getViewport()
    const centerX = (-x + window.innerWidth / 2) / zoom
    const centerY = (-y + window.innerHeight / 2) / zoom

    addTableWithColumns(
      'users',
      { x: Math.round(centerX), y: Math.round(centerY) },
      [
        {
          name: 'email',
          type: ColumnType.VARCHAR,
          constraints: [ColumnConstraint.NOT_NULL, ColumnConstraint.UNIQUE],
        },
        {
          name: 'name',
          type: ColumnType.VARCHAR,
          constraints: [],
        },
      ]
    )
  }, [addTableWithColumns, getViewport])

  async function handleShare() {
    try {
      await copyShareUrl()
      toast.success('Share URL copied')
    } catch {
      toast.error('Failed to copy URL')
    }
  }

  function handleExportJSON() {
    const filename = schemaName ? `${schemaName}.json` : undefined
    downloadAsJSON(schema, filename)
  }

  function handleExportSQL() {
    const filename = schemaName ? `${schemaName}.sql` : undefined
    downloadAsSQL(schema, filename)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importFromFile(file)
      useSchemaStore.getState().newSchema()
      setSchema(imported)
      toast.success(`Imported "${file.name}"`)
    } catch {
      toast.error('Invalid schema file')
    }
    e.target.value = ''
  }

  return (
    <>
      {/* Top-left hamburger menu */}
      <div className="border-border bg-card/95 absolute top-4 left-4 z-10 rounded-lg border shadow-lg backdrop-blur-sm">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="m-0.5 flex size-8 items-center justify-center p-0"
                >
                  <MenuIcon
                    className={`absolute size-5 transition-all duration-200 ${menuOpen ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}
                  />
                  <XIcon
                    className={`absolute size-5 transition-all duration-200 ${menuOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}
                  />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Menu</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => {
                newSchema()
                toast.success('New schema created')
              }}
            >
              <FilePlusIcon className="size-3.5" />
              New
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLoadOpen(true)}>
              <FolderOpenIcon className="size-3.5" />
              Load
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJSON}>
              <DownloadIcon className="size-3.5" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSQL}>
              <DownloadIcon className="size-3.5" />
              Export SQL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <UploadIcon className="size-3.5" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Share2Icon className="size-3.5" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Toolbar — schema name + actions */}
      <div className="border-border bg-card/95 absolute top-4 right-4 z-10 flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-lg backdrop-blur-sm">
        {/* Schema name (inline editable) */}
        {editing ? (
          <input
            ref={nameInputRef}
            className="border-primary bg-background text-foreground ring-primary/30 mx-1 w-24 rounded border px-1.5 py-0.5 text-xs font-semibold ring-1 outline-none md:w-32"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                className="group hover:border-border mx-1 max-w-20 gap-1.5 border border-dashed border-transparent font-semibold md:max-w-40"
                onClick={startEditing}
              >
                <span className="truncate">{schemaName}</span>
                <PencilIcon className="text-muted-foreground/0 group-hover:text-muted-foreground size-2.5 shrink-0 transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Click to rename</TooltipContent>
          </Tooltip>
        )}

        <div className="bg-border mx-1 h-5 w-px" />
        {/* Add Table / Sample */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={handleAddTable}>
              <SquarePlusIcon className="size-3.5" />
              <span className="hidden md:inline">Add Table</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add an empty table to the canvas</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={handleAddSampleTable}>
              <TableIcon className="size-3.5" />
              <span className="hidden md:inline">Sample</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Add a sample "users" table with columns
          </TooltipContent>
        </Tooltip>

        <div className="bg-border mx-1 h-5 w-px" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => undo()}
              disabled={pastStates.length === 0}
            >
              <Undo2Icon className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => redo()}
              disabled={futureStates.length === 0}
            >
              <Redo2Icon className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <div className="bg-border mx-1 h-5 w-px" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="relative cursor-pointer p-1"
              onClick={() => {
                const isErrorsActive =
                  useLogBarStore.getState().activeTab === 'errors'
                const isExpanded = useLogBarStore.getState().expanded

                if (isExpanded && isErrorsActive) {
                  toggleLogBar()
                } else {
                  useLogBarStore.getState().setActiveTab('errors')
                  if (!isExpanded) toggleLogBar()
                }
              }}
            >
              <ShieldCheckIcon className="text-muted-foreground size-4" />
              {errorCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] tabular-nums"
                >
                  {errorCount}
                </Badge>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle validation panel</TooltipContent>
        </Tooltip>
      </div>

      <LoadDialog open={loadOpen} onOpenChange={setLoadOpen} />
    </>
  )
}
