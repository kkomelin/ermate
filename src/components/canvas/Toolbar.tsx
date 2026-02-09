import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSchemaStore } from "@/hooks/useSchemaStore";
import { ColumnConstraint, ColumnType } from "@/types/schema";

export function Toolbar() {
  const addTable = useSchemaStore((s) => s.addTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const { getViewport } = useReactFlow();

  const handleAddTable = useCallback(() => {
    const { x, y, zoom } = getViewport();
    // Place new table near center of current viewport
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;

    // Add some randomness so tables don't stack
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;

    addTable(`table_${Date.now()}`, {
      x: Math.round(centerX + offsetX),
      y: Math.round(centerY + offsetY),
    });
  }, [addTable, getViewport]);

  const handleAddSampleTable = useCallback(() => {
    const { x, y, zoom } = getViewport();
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;

    addTable("users", { x: Math.round(centerX), y: Math.round(centerY) });

    // Get the newly added table
    const schema = useSchemaStore.getState().schema;
    const newTable = schema.tables[schema.tables.length - 1];

    addColumn(newTable.id, {
      name: "id",
      type: ColumnType.INTEGER,
      constraints: [ColumnConstraint.PRIMARY_KEY, ColumnConstraint.NOT_NULL],
    });
    addColumn(newTable.id, {
      name: "email",
      type: ColumnType.VARCHAR,
      constraints: [ColumnConstraint.NOT_NULL, ColumnConstraint.UNIQUE],
    });
    addColumn(newTable.id, {
      name: "name",
      type: ColumnType.VARCHAR,
      constraints: [],
    });
    addColumn(newTable.id, {
      name: "created_at",
      type: ColumnType.TIMESTAMP,
      constraints: [ColumnConstraint.NOT_NULL],
    });
  }, [addTable, addColumn, getViewport]);

  return (
    <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
      <span className="mr-1 px-2 text-xs font-bold tracking-tight text-card-foreground">
        ERMate
      </span>

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="xs" onClick={handleAddTable}>
            <svg
              className="size-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <line x1="8" y1="5" x2="8" y2="11" />
              <line x1="5" y1="8" x2="11" y2="8" />
            </svg>
            <span>Add Table</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add an empty table to the canvas</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="xs" onClick={handleAddSampleTable}>
            <svg
              className="size-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <line x1="2" y1="6" x2="14" y2="6" />
              <line x1="2" y1="10" x2="14" y2="10" />
              <line x1="6" y1="6" x2="6" y2="14" />
            </svg>
            <span>Sample</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add a sample "users" table with columns</TooltipContent>
      </Tooltip>
    </div>
  );
}
