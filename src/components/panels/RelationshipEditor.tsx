import { useState, useEffect, useMemo } from "react";
import { ArrowRightIcon, Trash2Icon } from "lucide-react";
import { useSchemaStore } from "@/hooks/useSchemaStore";
import { RelationshipType } from "@/types/schema";
import type { RelationshipType as RelType } from "@/types/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "./ConfirmDelete";

const REL_TYPE_OPTIONS: { value: RelType; label: string; badge: string }[] = [
  { value: RelationshipType.ONE_TO_ONE, label: "One-to-One", badge: "1:1" },
  { value: RelationshipType.ONE_TO_MANY, label: "One-to-Many", badge: "1:M" },
  {
    value: RelationshipType.MANY_TO_MANY,
    label: "Many-to-Many",
    badge: "M:M",
  },
];

function EndpointLabel({
  tableName,
  columnName,
}: {
  tableName: string;
  columnName: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-baseline gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5">
      <span className="truncate text-xs font-semibold text-card-foreground">
        {tableName}
      </span>
      <span className="text-[10px] text-muted-foreground">.</span>
      <span className="truncate text-[11px] text-muted-foreground">
        {columnName}
      </span>
    </div>
  );
}

export function RelationshipEditor() {
  const schema = useSchemaStore((s) => s.schema);
  const pendingConnection = useSchemaStore((s) => s.pendingConnection);
  const setPendingConnection = useSchemaStore((s) => s.setPendingConnection);
  const selectedRelationshipId = useSchemaStore(
    (s) => s.selectedRelationshipId,
  );
  const selectRelationship = useSchemaStore((s) => s.selectRelationship);
  const addRelationship = useSchemaStore((s) => s.addRelationship);
  const updateRelationship = useSchemaStore((s) => s.updateRelationship);
  const removeRelationship = useSchemaStore((s) => s.removeRelationship);
  const generateJunctionTable = useSchemaStore(
    (s) => s.generateJunctionTable,
  );

  const existingRel = selectedRelationshipId
    ? schema.relationships.find((r) => r.id === selectedRelationshipId)
    : null;

  const isCreate = !!pendingConnection;
  const isEdit = !!existingRel;
  const open = isCreate || isEdit;

  const [relType, setRelType] = useState<RelType>(
    RelationshipType.ONE_TO_MANY,
  );
  const [genJunction, setGenJunction] = useState(false);

  // Sync state when dialog opens
  useEffect(() => {
    if (existingRel) {
      setRelType(existingRel.type);
      setGenJunction(false);
    } else if (pendingConnection) {
      setRelType(RelationshipType.ONE_TO_MANY);
      setGenJunction(false);
    }
  }, [existingRel, pendingConnection]);

  // Resolve endpoint names
  const endpoints = useMemo(() => {
    const source = isEdit ? existingRel.source : pendingConnection?.source;
    const target = isEdit ? existingRel.target : pendingConnection?.target;
    if (!source || !target) return null;

    const sourceTable = schema.tables.find((t) => t.id === source.tableId);
    const targetTable = schema.tables.find((t) => t.id === target.tableId);
    const sourceCol = sourceTable?.columns.find(
      (c) => c.id === source.columnId,
    );
    const targetCol = targetTable?.columns.find(
      (c) => c.id === target.columnId,
    );

    return {
      source: {
        tableName: sourceTable?.name ?? "—",
        columnName: sourceCol?.name ?? "—",
      },
      target: {
        tableName: targetTable?.name ?? "—",
        columnName: targetCol?.name ?? "—",
      },
    };
  }, [schema.tables, existingRel, pendingConnection, isEdit]);

  const handleClose = () => {
    if (isCreate) setPendingConnection(null);
    if (isEdit) selectRelationship(null);
  };

  const handleSave = () => {
    if (isCreate && pendingConnection) {
      addRelationship({
        source: pendingConnection.source,
        target: pendingConnection.target,
        type: relType,
      });
      if (relType === RelationshipType.MANY_TO_MANY && genJunction) {
        generateJunctionTable(
          pendingConnection.source.tableId,
          pendingConnection.target.tableId,
        );
      }
      setPendingConnection(null);
    } else if (isEdit && existingRel) {
      updateRelationship(existingRel.id, { type: relType });
      if (
        relType === RelationshipType.MANY_TO_MANY &&
        genJunction &&
        existingRel.type !== RelationshipType.MANY_TO_MANY
      ) {
        generateJunctionTable(
          existingRel.source.tableId,
          existingRel.target.tableId,
        );
      }
      selectRelationship(null);
    }
  };

  const handleDelete = () => {
    if (existingRel) {
      removeRelationship(existingRel.id);
    }
  };

  if (!open || !endpoints) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="font-mono sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {isCreate ? "New Relationship" : "Edit Relationship"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isCreate
              ? "Configure the relationship between these columns."
              : "Modify the relationship type or remove it."}
          </DialogDescription>
        </DialogHeader>

        {/* Endpoints */}
        <div className="space-y-2">
          <Label className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Connection
          </Label>
          <div className="flex items-center gap-2">
            <EndpointLabel {...endpoints.source} />
            <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
            <EndpointLabel {...endpoints.target} />
          </div>
        </div>

        {/* Type selector */}
        <div className="space-y-2">
          <Label className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Type
          </Label>
          <Select
            value={relType}
            onValueChange={(v) => {
              setRelType(v as RelType);
              if (v !== RelationshipType.MANY_TO_MANY) setGenJunction(false);
            }}
          >
            <SelectTrigger className="h-8 w-full font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="font-mono">
              {REL_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-6 text-center text-[10px] font-bold text-muted-foreground">
                      {opt.badge}
                    </span>
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Junction table checkbox — M:M only */}
        {relType === RelationshipType.MANY_TO_MANY && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2.5">
            <Checkbox
              id="gen-junction"
              checked={genJunction}
              onCheckedChange={(v) => setGenJunction(v === true)}
            />
            <Label
              htmlFor="gen-junction"
              className="cursor-pointer text-xs leading-tight text-muted-foreground"
            >
              Generate junction table
            </Label>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-2">
          {isEdit && (
            <ConfirmDelete
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-auto gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-3" />
                  Delete
                </Button>
              }
              title="Delete relationship?"
              description={
                <>
                  The relationship between{" "}
                  <strong className="font-mono">
                    {endpoints.source.tableName}
                  </strong>{" "}
                  and{" "}
                  <strong className="font-mono">
                    {endpoints.target.tableName}
                  </strong>{" "}
                  will be permanently removed.
                </>
              }
              onConfirm={handleDelete}
            />
          )}
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            {isCreate ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
