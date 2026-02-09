import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useSchemaStore } from "@/hooks/useSchemaStore";
import { ColumnType } from "@/types/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ColumnRow } from "./ColumnRow";
import { cn } from "@/lib/utils";

export function TableEditor() {
  const schema = useSchemaStore((s) => s.schema);
  const selectedTableId = useSchemaStore((s) => s.selectedTableId);
  const updateTable = useSchemaStore((s) => s.updateTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const updateColumn = useSchemaStore((s) => s.updateColumn);
  const removeColumn = useSchemaStore((s) => s.removeColumn);
  const removeTable = useSchemaStore((s) => s.removeTable);
  const selectTable = useSchemaStore((s) => s.selectTable);

  const table = selectedTableId
    ? schema.tables.find((t) => t.id === selectedTableId)
    : null;

  if (!table) return null;

  const handleAddColumn = () => {
    addColumn(table.id, {
      name: `column_${table.columns.length + 1}`,
      type: ColumnType.VARCHAR,
      constraints: [],
    });
  };

  const handleDeleteTable = () => {
    removeTable(table.id);
  };

  return (
    <div
      className={cn(
        "absolute top-0 right-0 z-20 flex h-full w-[320px] flex-col border-l bg-card font-mono shadow-lg",
        "animate-in slide-in-from-right duration-200",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Table
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={() => selectTable(null)}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Table name */}
        <div className="px-3 pt-3 pb-2">
          <Label className="mb-1.5 text-[10px] tracking-wider text-muted-foreground uppercase">
            Name
          </Label>
          <Input
            value={table.name}
            onChange={(e) => updateTable(table.id, { name: e.target.value })}
            className="h-8 font-mono text-sm font-semibold shadow-none"
          />
        </div>

        <Separator />

        {/* Columns */}
        <div className="px-3 pt-2 pb-1">
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Columns
            </Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {table.columns.length}
            </span>
          </div>

          {table.columns.length === 0 ? (
            <div className="py-4 text-center text-[11px] italic text-muted-foreground">
              No columns yet
            </div>
          ) : (
            <div className="divide-y divide-border/50">
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon className="size-3" />
              Delete Table
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete table?</AlertDialogTitle>
              <AlertDialogDescription>
                Table <strong className="font-mono">{table.name}</strong> and
                all its columns will be permanently removed. Any relationships
                involving this table will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="sm"
                onClick={handleDeleteTable}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
