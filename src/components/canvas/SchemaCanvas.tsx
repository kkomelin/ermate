import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnConnect,
  type NodeTypes,
} from "@xyflow/react";
import { useSchemaStore } from "@/hooks/useSchemaStore";
import { TableNode, type TableNodeData } from "./TableNode";
import { RelationshipType } from "@/types/schema";

const nodeTypes: NodeTypes = {
  table: TableNode,
};

export function SchemaCanvas() {
  const schema = useSchemaStore((s) => s.schema);
  const selectedTableId = useSchemaStore((s) => s.selectedTableId);
  const selectTable = useSchemaStore((s) => s.selectTable);
  const updateTable = useSchemaStore((s) => s.updateTable);
  const addRelationship = useSchemaStore((s) => s.addRelationship);

  const onSelect = useCallback(
    (tableId: string) => selectTable(tableId),
    [selectTable],
  );

  const nodes: Node[] = useMemo(
    () =>
      schema.tables.map((table) => ({
        id: table.id,
        type: "table",
        position: table.position,
        data: {
          table,
          selected: table.id === selectedTableId,
          onSelect,
        } satisfies TableNodeData,
        selected: table.id === selectedTableId,
      })),
    [schema.tables, selectedTableId, onSelect],
  );

  const edges: Edge[] = useMemo(
    () =>
      schema.relationships.map((rel) => ({
        id: rel.id,
        source: rel.source.tableId,
        sourceHandle: `${rel.source.columnId}-source`,
        target: rel.target.tableId,
        targetHandle: `${rel.target.columnId}-target`,
        type: "smoothstep",
        animated: rel.type === RelationshipType.ONE_TO_MANY,
        label: rel.type,
        labelStyle: { fontSize: 10, fontFamily: "monospace" },
        style: { stroke: "var(--color-muted-foreground)", strokeWidth: 1.5 },
      })),
    [schema.relationships],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateTable(change.id, { position: change.position });
        }
      }

      // Handle selection changes
      for (const change of changes) {
        if (change.type === "select" && change.selected) {
          selectTable(change.id);
        }
      }
    },
    [nodes, updateTable, selectTable],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle ||
        !connection.targetHandle
      )
        return;

      // Extract column IDs from handle IDs (format: "columnId-source" / "columnId-target")
      const sourceColumnId = connection.sourceHandle.replace("-source", "");
      const targetColumnId = connection.targetHandle.replace("-target", "");

      addRelationship({
        source: {
          tableId: connection.source,
          columnId: sourceColumnId,
        },
        target: {
          tableId: connection.target,
          columnId: targetColumnId,
        },
        type: RelationshipType.ONE_TO_MANY,
      });
    },
    [addRelationship],
  );

  const onPaneClick = useCallback(() => {
    selectTable(null);
  }, [selectTable]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      fitView
      snapToGrid
      snapGrid={[16, 16]}
      minZoom={0.25}
      maxZoom={2}
      className="bg-background"
    >
      <Background
        variant={BackgroundVariant.Lines}
        gap={16}
        size={1}
        color="var(--color-border)"
      />
      <Controls className="!rounded-lg !border !border-border !bg-card !shadow-md [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-card-foreground [&>button]:hover:!bg-muted" />
      <MiniMap
        className="!rounded-lg !border !border-border !bg-card !shadow-md"
        nodeColor="var(--color-muted)"
        maskColor="var(--color-background)"
      />
    </ReactFlow>
  );
}
