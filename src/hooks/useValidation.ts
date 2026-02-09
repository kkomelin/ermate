import { useMemo } from 'react'
import { useSchemaStore } from './useSchemaStore'

export function useValidation() {
  const schema = useSchemaStore((s) => s.schema)
  const validate = useSchemaStore((s) => s.validate)

  const issues = useMemo(() => validate(), [schema, validate])

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
