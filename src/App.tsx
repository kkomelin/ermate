import { ReactFlowProvider } from "@xyflow/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchemaCanvas } from "@/components/canvas/SchemaCanvas";
import { Toolbar } from "@/components/canvas/Toolbar";

function App() {
  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <div className="relative h-screen w-screen overflow-hidden">
          <Toolbar />
          <SchemaCanvas />
        </div>
      </ReactFlowProvider>
    </TooltipProvider>
  );
}

export default App;
