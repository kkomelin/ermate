import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/panels/ConfirmDelete";
import * as DalService from "@/services/dal";
import type { SchemaMeta } from "@/types/schema";
import { useSchemaStore } from "@/hooks/useSchemaStore";

interface LoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LoadDialog({ open, onOpenChange }: LoadDialogProps) {
  const loadSchema = useSchemaStore((s) => s.loadSchema);
  const newSchema = useSchemaStore((s) => s.newSchema);
  const [schemas, setSchemas] = useState<SchemaMeta[]>([]);

  useEffect(() => {
    if (open) {
      setSchemas(DalService.listSchemas());
    }
  }, [open]);

  function handleLoad(meta: SchemaMeta) {
    const schema = DalService.getSchema(meta.id);
    if (!schema) {
      toast.error("Schema not found");
      return;
    }
    loadSchema(meta.id, meta.name, schema);
    toast.success(`Loaded "${meta.name}"`);
    onOpenChange(false);
  }

  function handleDelete(id: string) {
    DalService.deleteSchema(id);
    setSchemas((prev) => prev.filter((s) => s.id !== id));
    toast.success("Schema deleted");
  }

  function handleNew() {
    newSchema();
    toast.success("New schema created");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Load Schema</DialogTitle>
          <DialogDescription>
            Open a previously saved schema or start fresh.
          </DialogDescription>
        </DialogHeader>

        {schemas.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No saved schemas yet.
          </div>
        ) : (
          <div className="-mx-2 max-h-64 overflow-y-auto">
            {schemas.map((meta) => (
              <div
                key={meta.id}
                className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                onClick={() => handleLoad(meta)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {meta.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {relativeTime(meta.updatedAt)}
                  </div>
                </div>
                <div
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ConfirmDelete
                    trigger={
                      <Button variant="ghost" size="icon-xs">
                        <svg
                          className="size-3"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6.5 7v4M9.5 7v4M4.5 4l.5 8.5a1 1 0 001 .5h4a1 1 0 001-.5L11.5 4" />
                        </svg>
                      </Button>
                    }
                    title="Delete Schema"
                    description={
                      <>
                        Delete <strong>{meta.name}</strong>? This cannot be
                        undone.
                      </>
                    }
                    onConfirm={() => handleDelete(meta.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleNew}
          >
            New Schema
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
