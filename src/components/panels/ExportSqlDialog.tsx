import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SQL_DIALECTS, type SQLDialect } from '@/services/sql-parser'
import { useState } from 'react'

interface ExportSqlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (dialect: SQLDialect) => void
}

export function ExportSqlDialog({
  open,
  onOpenChange,
  onConfirm,
}: ExportSqlDialogProps) {
  const [dialect, setDialect] = useState<SQLDialect>('PostgreSQL')

  function handleExport() {
    onConfirm(dialect)
    onOpenChange(false)
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export SQL</DialogTitle>
          <DialogDescription>
            Choose the database type for the exported SQL file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="sql-dialect"
              className="text-muted-foreground text-sm font-medium"
            >
              Database type
            </label>
            <Select
              value={dialect}
              onValueChange={(v) => setDialect(v as SQLDialect)}
            >
              <SelectTrigger id="sql-dialect" className="w-full">
                <SelectValue placeholder="Select dialect" />
              </SelectTrigger>
              <SelectContent>
                {SQL_DIALECTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
