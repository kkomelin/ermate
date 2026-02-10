import { useMemo, useState, useEffect, useRef } from 'react'
import { useSchemaStore } from './useSchemaStore'
import type { ValidationError } from '@/types/schema'

export function useValidation() {
  const schema = useSchemaStore((s) => s.schema)
  const validate = useSchemaStore((s) => s.validate)

  const [issues, setIssues] = useState<ValidationError[]>(() => validate())
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIssues(validate()), 500)
    return () => clearTimeout(timeoutRef.current)
  }, [schema, validate])

  const errors = useMemo(
    () => issues.filter((i) => i.type === 'error'),
    [issues]
  )

  const warnings = useMemo(
    () => issues.filter((i) => i.type === 'warning'),
    [issues]
  )

  return {
    issues,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
  }
}
