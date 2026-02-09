import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import type { Schema } from "@/types/schema";

const HASH_PREFIX = "schema=";

export function encodeSchema(schema: Schema): string {
  const json = JSON.stringify(schema);
  return compressToEncodedURIComponent(json);
}

export function decodeSchema(compressed: string): Schema | null {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.tables)) return null;
    return parsed as Schema;
  } catch {
    return null;
  }
}

export function buildShareUrl(schema: Schema): string {
  const encoded = encodeSchema(schema);
  return `${window.location.origin}${window.location.pathname}#${HASH_PREFIX}${encoded}`;
}

export function getSchemaFromUrl(): Schema | null {
  const hash = window.location.hash;
  if (!hash.startsWith(`#${HASH_PREFIX}`)) return null;
  const compressed = hash.slice(HASH_PREFIX.length + 1);
  return decodeSchema(compressed);
}

export async function copyShareUrl(schema: Schema): Promise<string> {
  const url = buildShareUrl(schema);
  await navigator.clipboard.writeText(url);
  return url;
}
