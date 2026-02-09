import { useCallback, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSchemaStore } from "@/hooks/useSchemaStore";
import { useShareUrl } from "@/hooks/useShareUrl";
import * as DalService from "@/services/dal";
import { downloadAsJSON, downloadAsSQL, importFromFile } from "@/services/export-import";
import { SaveDialog } from "@/components/panels/SaveDialog";
import { LoadDialog } from "@/components/panels/LoadDialog";
import { ColumnConstraint, ColumnType } from "@/types/schema";

export function Toolbar() {
  const addTable = useSchemaStore((s) => s.addTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const schema = useSchemaStore((s) => s.schema);
  const schemaId = useSchemaStore((s) => s.schemaId);
  const schemaName = useSchemaStore((s) => s.schemaName);
  const setSchema = useSchemaStore((s) => s.setSchema);
  const { getViewport } = useReactFlow();
  const { copyShareUrl } = useShareUrl();

  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTable = useCallback(() => {
    const { x, y, zoom } = getViewport();
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;
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

    const currentSchema = useSchemaStore.getState().schema;
    const newTable = currentSchema.tables[currentSchema.tables.length - 1];

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

  function handleSave() {
    if (schemaId) {
      DalService.saveSchema(schemaId, schemaName, schema);
      toast.success("Saved");
    } else {
      setSaveOpen(true);
    }
  }

  async function handleShare() {
    try {
      await copyShareUrl();
      toast.success("Share URL copied");
    } catch {
      toast.error("Failed to copy URL");
    }
  }

  function handleExportJSON() {
    const filename = schemaName !== "Untitled" ? `${schemaName}.json` : undefined;
    downloadAsJSON(schema, filename);
  }

  function handleExportSQL() {
    const filename = schemaName !== "Untitled" ? `${schemaName}.sql` : undefined;
    downloadAsSQL(schema, filename);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromFile(file);
      // Load as new unsaved schema
      useSchemaStore.getState().newSchema();
      setSchema(imported);
      toast.success(`Imported "${file.name}"`);
    } catch {
      toast.error("Invalid schema file");
    }
    // Reset input so same file can be re-imported
    e.target.value = "";
  }

  const displayName = schemaName !== "Untitled" ? schemaName : null;

  return (
    <>
      <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
        {/* Brand / schema name */}
        <span className="mr-1 flex items-center gap-1.5 px-2 text-xs font-bold tracking-tight text-card-foreground">
          ERMate
          {displayName && (
            <>
              <span className="font-normal text-muted-foreground">/</span>
              <span className="max-w-24 truncate font-medium">{displayName}</span>
            </>
          )}
        </span>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Save / Load */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={handleSave}>
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12.5 14H3.5a1 1 0 01-1-1V3a1 1 0 011-1h7l3 3v8a1 1 0 01-1 1z" />
                <path d="M10 14V9H6v5M6 2v3h4" />
              </svg>
              <span>Save</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save schema to browser storage</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={() => setLoadOpen(true)}>
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2.5 5V3a1 1 0 011-1h3l1.5 2h5a1 1 0 011 1v7a1 1 0 01-1 1h-10a1 1 0 01-1-1V5z" />
              </svg>
              <span>Load</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Load a saved schema</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Add Table / Sample */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={handleAddTable}>
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
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
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
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

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Share / Export / Import */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={handleShare}>
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="3.5" r="1.5" />
                <circle cx="4" cy="8" r="1.5" />
                <circle cx="12" cy="12.5" r="1.5" />
                <line x1="5.4" y1="7.1" x2="10.6" y2="4.4" />
                <line x1="5.4" y1="8.9" x2="10.6" y2="11.6" />
              </svg>
              <span>Share</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy shareable URL to clipboard</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="xs">
                  <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 12.5h10" />
                  </svg>
                  <span>Export</span>
                  <svg className="size-2.5 ml-0.5 opacity-60" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M2 4l3 3 3-3z" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Export schema as JSON or SQL</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportJSON}>
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSQL}>
              Export SQL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={() => fileInputRef.current?.click()}>
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 14V6M4.5 9.5L8 6l3.5 3.5M3 3.5h10" />
              </svg>
              <span>Import</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import schema from JSON file</TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} />
      <LoadDialog open={loadOpen} onOpenChange={setLoadOpen} />
    </>
  );
}
