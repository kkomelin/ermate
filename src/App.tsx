import { SchemaCanvas } from '@/components/canvas/SchemaCanvas'
import { Toolbar } from '@/components/canvas/Toolbar'
import { LogBar } from '@/components/panels/LogBar'
import { RelationshipEditor } from '@/components/panels/RelationshipEditor'
import { TableEditor } from '@/components/panels/TableEditor'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useShareUrl } from '@/hooks/useShareUrl'
import { useTheme } from '@/hooks/useTheme'
import { ReactFlowProvider } from '@xyflow/react'

function AppInner() {
  useAutoSave()
  useShareUrl()
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] supports-[height:1dvh]:h-dvh">
      <div className="relative min-h-0 flex-1">
        <Toolbar />
        <SchemaCanvas />
        <TableEditor />
        <RelationshipEditor />
      </div>
      <LogBar />
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
