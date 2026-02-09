import { ReactFlowProvider } from "@xyflow/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SchemaCanvas } from "@/components/canvas/SchemaCanvas";
import { Toolbar } from "@/components/canvas/Toolbar";
import { TableEditor } from "@/components/panels/TableEditor";
import { RelationshipEditor } from "@/components/panels/RelationshipEditor";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useShareUrl } from "@/hooks/useShareUrl";
import { useSchemaStore } from "@/hooks/useSchemaStore";

function AppInner() {
  const schemaId = useSchemaStore((s) => s.schemaId);
  const schemaName = useSchemaStore((s) => s.schemaName);

  useAutoSave(schemaId, schemaName);
  useShareUrl();

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Toolbar />
      <SchemaCanvas />
      <TableEditor />
      <RelationshipEditor />
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <AppInner />
        <Toaster position="bottom-center" richColors />
      </ReactFlowProvider>
    </TooltipProvider>
  );
}

export default App;
