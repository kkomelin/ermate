import { useEffect } from 'react'

import * as SharingService from '@/services/sharing'
import { useSchemaStore } from '@/hooks/useSchemaStore'

export function useShareUrl() {
  const setSchema = useSchemaStore((s) => s.setSchema)

  // On mount, check URL for shared schema
  useEffect(() => {
    const schema = SharingService.getSchemaFromUrl()
    if (schema) {
      setSchema(schema)
      // Clear the hash so it doesn't re-trigger on future navigations
      window.history.replaceState(null, '', window.location.pathname)
    }
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
