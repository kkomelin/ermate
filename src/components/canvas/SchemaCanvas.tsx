import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  applyNodeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnConnect,
  type NodeTypes,
} from '@xyflow/react'
import { MoonIcon, SunIcon, TablePropertiesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSchemaStore } from '@/hooks/useSchemaStore'
import { useTheme } from '@/hooks/useTheme'
import { TableNode, type TableNodeData } from './TableNode'
import { RelationshipType } from '@/types/schema'

const nodeTypes: NodeTypes = {
  table: TableNode,
}

export function SchemaCanvas() {
  const { theme, toggleTheme } = useTheme()
  const schema = useSchemaStore((s) => s.schema)
  const selectedTableId = useSchemaStore((s) => s.selectedTableId)
  const selectedRelationshipId = useSchemaStore((s) => s.selectedRelationshipId)
  const selectTable = useSchemaStore((s) => s.selectTable)
  const selectRelationship = useSchemaStore((s) => s.selectRelationship)
  const updateTable = useSchemaStore((s) => s.updateTable)
  const setPendingConnection = useSchemaStore((s) => s.setPendingConnection)
  const removeTable = useSchemaStore((s) => s.removeTable)
  const removeRelationship = useSchemaStore((s) => s.removeRelationship)

  const { fitView } = useReactFlow()

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => fitView({ padding: 0.1, maxZoom: 1 }), 200)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [fitView])

  // Handle Delete key press — read schema from store at event time to avoid
  // re-registering the listener on every schema change (which happens per keystroke).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key === 'Delete') {
        e.preventDefault()
        const { selectedTableId: tableId, selectedRelationshipId: relId } =
          useSchemaStore.getState()

        if (tableId) {
          removeTable(tableId)
        } else if (relId) {
          removeRelationship(relId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Store nodes in local state for React Flow
  const [nodes, setNodes] = useState<Node[]>(() =>
    schema.tables.map((table) => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: {
        table,
        selected: table.id === selectedTableId,
        onSelect: selectTable,
      } satisfies TableNodeData,
      selected: table.id === selectedTableId,
    }))
  )

  // Sync nodes when tables are added/removed/updated (but not on selection change)
  useEffect(() => {
    setNodes((currentNodes) => {
      // Create a map of current nodes by id
      const nodeMap = new Map(currentNodes.map((n) => [n.id, n]))

      // Update nodes based on schema.tables
      return schema.tables.map((table) => {
        const existingNode = nodeMap.get(table.id)

        // If node exists, preserve React Flow's internal state
        if (existingNode) {
          return {
            ...existingNode,
            position: table.position,
            data: {
              table,
              selected: table.id === selectedTableId,
              onSelect: selectTable,
            } satisfies TableNodeData,
            selected: table.id === selectedTableId,
          }
        }

        // New node
        return {
          id: table.id,
          type: 'table',
          position: table.position,
          data: {
            table,
            selected: table.id === selectedTableId,
            onSelect: selectTable,
          } satisfies TableNodeData,
          selected: table.id === selectedTableId,
        }
      })
    })
  }, [schema.tables, selectedTableId, selectTable])

  const edges: Edge[] = useMemo(
    () =>
      schema.relationships.map((rel) => {
        const selected = rel.id === selectedRelationshipId
        return {
          id: rel.id,
          source: rel.source.tableId,
          sourceHandle: `${rel.source.columnId}-source`,
          target: rel.target.tableId,
          targetHandle: `${rel.target.columnId}-target`,
          type: 'smoothstep',
          animated: rel.type === RelationshipType.ONE_TO_MANY,
          label: rel.type,
          labelStyle: {
            fontSize: 10,
            fontFamily: 'monospace',
            fill: 'var(--color-foreground)',
          },
          labelBgStyle: {
            fill: 'var(--color-background)',
            fillOpacity: 0.9,
          },
          style: {
            stroke: selected
              ? 'var(--color-primary)'
              : 'var(--color-muted-foreground)',
            strokeWidth: selected ? 2.5 : 1.5,
          },
        }
      }),
    [schema.relationships, selectedRelationshipId]
  )

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes to React Flow's internal state
      setNodes((nds) => applyNodeChanges(changes, nds))

      // Sync position changes back to our store
      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          // Only update store when drag is complete
          updateTable(change.id, { position: change.position })
        }
      }
    },
    [updateTable]
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle ||
        !connection.targetHandle
      )
        return

      // Extract column IDs from handle IDs (format: "columnId-source" / "columnId-target")
      const sourceColumnId = connection.sourceHandle.replace('-source', '')
      const targetColumnId = connection.targetHandle.replace('-target', '')

      setPendingConnection({
        source: {
          tableId: connection.source,
          columnId: sourceColumnId,
        },
        target: {
          tableId: connection.target,
          columnId: targetColumnId,
        },
      })
    },
    [setPendingConnection]
  )

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectRelationship(edge.id)
    },
    [selectRelationship]
  )

  const onPaneClick = useCallback(() => {
    selectTable(null)
    selectRelationship(null)
  }, [selectTable, selectRelationship])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ maxZoom: 1 }}
      snapToGrid
      snapGrid={[16, 16]}
      minZoom={0.25}
      maxZoom={2}
      className="bg-background"
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Lines}
        gap={16}
        size={1}
        color="var(--color-border)"
      />
      <Controls className="!border-border !bg-card [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-card-foreground [&>button]:hover:!bg-muted !rounded-lg !border !shadow-md" />
      {/* ERMate branding + theme toggle */}
      <div className="border-border bg-card/90 text-muted-foreground absolute right-2 bottom-2 z-10 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold tracking-tight shadow-sm backdrop-blur-sm">
        <TablePropertiesIcon className="size-3.5" />
        ERMate
        <div className="bg-border mx-0.5 h-3.5 w-px" />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="text-muted-foreground hover:text-foreground size-5"
        >
          {theme === 'dark' ? (
            <SunIcon className="size-3.5" />
          ) : (
            <MoonIcon className="size-3.5" />
          )}
        </Button>
      </div>
    </ReactFlow>
  )
}
