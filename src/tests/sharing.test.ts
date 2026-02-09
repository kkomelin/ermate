import { describe, it, expect } from 'vitest'
import { encodeSchema, decodeSchema } from '@/services/sharing'
import type { Schema } from '@/types/schema'
import { testSchema } from './fixtures'

describe('sharing service', () => {
  describe('round-trip encode/decode', () => {
    it('encodes and decodes a schema', () => {
      const encoded = encodeSchema(testSchema)
      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)

      const decoded = decodeSchema(encoded)
      expect(decoded).toEqual(testSchema)
    })

    it('produces URL-safe strings', () => {
      const encoded = encodeSchema(testSchema)
      // lz-string's compressToEncodedURIComponent produces URI-safe output
      expect(encoded).not.toContain(' ')
      expect(encoded).not.toContain('#')
      expect(encoded).not.toContain('&')
      expect(encoded).not.toContain('?')
    })

    it('round-trips an empty schema', () => {
      const empty: Schema = { version: 1, tables: [], relationships: [] }
      const encoded = encodeSchema(empty)
      const decoded = decodeSchema(encoded)
      expect(decoded).toEqual(empty)
    })

    it('round-trips a complex schema', () => {
      const encoded = encodeSchema(testSchema)
      const decoded = decodeSchema(encoded)
      expect(decoded).toEqual(testSchema)
      expect(decoded!.tables).toHaveLength(2)
      expect(decoded!.relationships).toHaveLength(1)
    })

    it('produces compact output', () => {
      const json = JSON.stringify(testSchema)
      const encoded = encodeSchema(testSchema)
      // Compressed should be smaller than raw JSON
      expect(encoded.length).toBeLessThan(json.length)
    })
  })

  describe('decodeSchema error handling', () => {
    it('returns null for empty string', () => {
      expect(decodeSchema('')).toBeNull()
    })

    it('returns null for garbage input', () => {
      expect(decodeSchema('not-a-valid-compressed-string!!!')).toBeNull()
    })

    it('returns null for valid JSON that is not a schema', async () => {
      const { compressToEncodedURIComponent } = await import('lz-string')
      const compressed = compressToEncodedURIComponent(
        JSON.stringify({ foo: 'bar' })
      )
      expect(decodeSchema(compressed)).toBeNull()
    })
  })
})
