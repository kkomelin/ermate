import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as DalService from "@/services/dal";
import { useSchemaStore } from "@/hooks/useSchemaStore";

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveDialog({ open, onOpenChange }: SaveDialogProps) {
  const schema = useSchemaStore((s) => s.schema);
  const schemaName = useSchemaStore((s) => s.schemaName);
  const setSchemaIdentity = useSchemaStore((s) => s.setSchemaIdentity);
  const [name, setName] = useState("");

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      setName(schemaName === "Untitled" ? "" : schemaName);
    }
    onOpenChange(isOpen);
  }

  function handleSave() {
    const trimmed = name.trim() || "Untitled";
    const id = crypto.randomUUID();
    DalService.saveSchema(id, trimmed, schema);
    setSchemaIdentity(id, trimmed);
    toast.success(`Saved "${trimmed}"`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Schema</DialogTitle>
          <DialogDescription>
            Give your schema a name to save it locally.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="schema-name">Name</Label>
          <Input
            id="schema-name"
            placeholder="My Schema"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
