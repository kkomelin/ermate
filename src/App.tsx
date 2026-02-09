import { ReactFlowProvider } from "@xyflow/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchemaCanvas } from "@/components/canvas/SchemaCanvas";
import { Toolbar } from "@/components/canvas/Toolbar";
import { TableEditor } from "@/components/panels/TableEditor";
import { RelationshipEditor } from "@/components/panels/RelationshipEditor";

function App() {
  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <div className="relative h-screen w-screen overflow-hidden">
          <Toolbar />
          <SchemaCanvas />
          <TableEditor />
          <RelationshipEditor />
        </div>
      </ReactFlowProvider>
    </TooltipProvider>
  );
}

export default App;
