import { ReactFlowProvider } from '@xyflow/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { SchemaCanvas } from '@/components/canvas/SchemaCanvas'
import { Toolbar } from '@/components/canvas/Toolbar'
import { TableEditor } from '@/components/panels/TableEditor'
import { RelationshipEditor } from '@/components/panels/RelationshipEditor'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useShareUrl } from '@/hooks/useShareUrl'
import { useTheme } from '@/hooks/useTheme'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function AppInner() {
  useAutoSave()
  useShareUrl()
  useKeyboardShortcuts()

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Toolbar />
      <SchemaCanvas />
      <TableEditor />
      <RelationshipEditor />
    </div>
  )
}

function App() {
  const { theme } = useTheme()

  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <AppInner />
        <Toaster position="bottom-center" richColors theme={theme} />
      </ReactFlowProvider>
    </TooltipProvider>
  )
}

export default App
