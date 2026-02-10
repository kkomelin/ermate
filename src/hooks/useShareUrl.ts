import { useEffect } from 'react'

import * as SharingService from '@/services/sharing'
import { useSchemaStore } from '@/hooks/useSchemaStore'

export function useShareUrl() {
  const setSchema = useSchemaStore((s) => s.setSchema)

  useEffect(() => {
    const loadFromHash = () => {
      const schema = SharingService.getSchemaFromUrl()
      if (schema) {
        setSchema(schema)
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    loadFromHash()
    window.addEventListener('hashchange', loadFromHash)
    return () => window.removeEventListener('hashchange', loadFromHash)
  }, [setSchema])

  return {
    generateShareUrl: () => {
      const schema = useSchemaStore.getState().schema
      return SharingService.buildShareUrl(schema)
    },
    copyShareUrl: () => {
      const schema = useSchemaStore.getState().schema
      return SharingService.copyShareUrl(schema)
    },
  }
}
