import { useLogBarStore } from '@/hooks/useLogBarStore'
import { useSchemaStore, useTemporalStore } from '@/hooks/useSchemaStore'
import { useValidation } from '@/hooks/useValidation'
import { cn } from '@/lib/utils'
import type { Schema } from '@/types/schema'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  HistoryIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useMemo } from 'react'

function describeChange(prev: Schema, curr: Schema): string {
  // Table additions
  if (curr.tables.length > prev.tables.length) {
    const added = curr.tables.find(
      (t) => !prev.tables.some((pt) => pt.id === t.id)
    )
    if (added) return `Added table "${added.name}"`
  }

  // Table removals
  if (curr.tables.length < prev.tables.length) {
    const removed = prev.tables.find(
      (t) => !curr.tables.some((ct) => ct.id === t.id)
    )
    if (removed) return `Removed table "${removed.name}"`
  }

  // Per-table changes
  for (const ct of curr.tables) {
    const pt = prev.tables.find((t) => t.id === ct.id)
    if (!pt) continue

    if (pt.name !== ct.name) return `Renamed table "${pt.name}" to "${ct.name}"`

    if (ct.columns.length > pt.columns.length) {
      const added = ct.columns.find(
        (c) => !pt.columns.some((pc) => pc.id === c.id)
      )
      if (added) return `Added column "${added.name}" to "${ct.name}"`
    }

    if (ct.columns.length < pt.columns.length) {
      const removed = pt.columns.find(
        (c) => !ct.columns.some((cc) => cc.id === c.id)
      )
      if (removed) return `Removed column "${removed.name}" from "${ct.name}"`
    }

    for (const cc of ct.columns) {
      const pc = pt.columns.find((c) => c.id === cc.id)
      if (!pc) continue
      if (pc.name !== cc.name)
        return `Renamed column "${pc.name}" to "${cc.name}" in "${ct.name}"`
      if (
        pc.type !== cc.type ||
        JSON.stringify(pc.constraints) !== JSON.stringify(cc.constraints)
      )
        return `Updated column "${cc.name}" in "${ct.name}"`
    }
  }

  // Relationship changes
  if (curr.relationships.length > prev.relationships.length)
    return 'Added relationship'
  if (curr.relationships.length < prev.relationships.length)
    return 'Removed relationship'
  if (
    curr.relationships.some(
      (r, i) =>
        r.type !== prev.relationships[i]?.type ||
        r.source.tableId !== prev.relationships[i]?.source.tableId ||
        r.source.columnId !== prev.relationships[i]?.source.columnId ||
        r.target.tableId !== prev.relationships[i]?.target.tableId ||
        r.target.columnId !== prev.relationships[i]?.target.columnId
    )
  )
    return 'Updated relationship'

  return 'Schema updated'
}

export function LogBar() {
  const schema = useSchemaStore((s) => s.schema)
  const pastStates = useTemporalStore((s) => s.pastStates)
  const { issues, errors, warnings } = useValidation()

  const historyEntries = useMemo(() => {
    const entries: string[] = []
    for (let i = 1; i < pastStates.length; i++) {
      const prev = pastStates[i - 1]?.schema
      const curr = pastStates[i]?.schema
      if (prev && curr) entries.push(describeChange(prev, curr))
    }
    const last = pastStates[pastStates.length - 1]?.schema
    if (last) {
      entries.push(describeChange(last, schema))
    }
    return entries.reverse()
  }, [pastStates, schema])

  const expanded = useLogBarStore((s) => s.expanded)
  const toggle = useLogBarStore((s) => s.toggle)
  const activeTab = useLogBarStore((s) => s.activeTab)
  const setActiveTab = useLogBarStore((s) => s.setActiveTab)

  return (
    <div className="bg-card/95 border-t shadow-lg backdrop-blur-sm">
      {/* Tab header row */}
      <div className="flex items-center">
        <div className="flex flex-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            aria-controls="history-panel"
            className={cn(
              'flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-1.5 text-xs font-medium',
              activeTab === 'history'
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
            onClick={() => {
              if (activeTab === 'history') {
                toggle()
              } else {
                setActiveTab('history')
                if (!expanded) toggle()
              }
            }}
          >
            <HistoryIcon className="size-3.5" />
            History
            {historyEntries.length > 0 && (
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {historyEntries.length}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'errors'}
            aria-controls="errors-panel"
            className={cn(
              'flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-1.5 text-xs font-medium',
              activeTab === 'errors'
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
            onClick={() => {
              if (activeTab === 'errors') {
                toggle()
              } else {
                setActiveTab('errors')
                if (!expanded) toggle()
              }
            }}
          >
            <OctagonXIcon
              className={cn(
                'size-3.5',
                errors.length > 0 ? 'text-destructive' : ''
              )}
            />
            Errors
            {issues.length > 0 && (
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  errors.length > 0
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                {issues.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          aria-label={expanded ? 'Collapse log panel' : 'Expand log panel'}
          aria-expanded={expanded}
          className="cursor-pointer px-3 py-1.5"
          onClick={toggle}
        >
          {expanded ? (
            <ChevronDownIcon className="text-muted-foreground size-4" />
          ) : (
            <ChevronUpIcon className="text-muted-foreground size-4" />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="max-h-40 space-y-1 overflow-y-auto border-t px-4 py-2">
          {activeTab === 'errors' && (
            <div role="tabpanel" id="errors-panel" aria-labelledby="errors-tab">
              {issues.length === 0 ? (
                <div className="text-muted-foreground flex items-center justify-start gap-1.5 py-2 text-xs">
                  <CircleCheckIcon className="size-3.5 text-emerald-500" />
                  No validation issues
                </div>
              ) : (
                <>
                  {errors.map((issue, i) => (
                    <div
                      key={`e-${i}`}
                      className="flex items-start gap-2 text-sm"
                    >
                      <OctagonXIcon className="text-destructive mt-0.5 size-4 shrink-0" />
                      <span className="text-muted-foreground">
                        {issue.message}
                      </span>
                    </div>
                  ))}
                  {warnings.map((issue, i) => (
                    <div
                      key={`w-${i}`}
                      className="flex items-start gap-2 text-sm"
                    >
                      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span className="text-muted-foreground">
                        {issue.message}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div
              role="tabpanel"
              id="history-panel"
              aria-labelledby="history-tab"
            >
              {historyEntries.length === 0 ? (
                <div className="text-muted-foreground py-2 text-left text-xs">
                  No changes yet
                </div>
              ) : (
                historyEntries.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <HistoryIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span className="text-muted-foreground">{entry}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
