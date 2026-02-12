const MAX_PROMPT_LENGTH = 1000

const BLOCKED_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /you\s+are\s+now\b/i,
  /pretend\s+you\s+are\b/i,
  /act\s+as\s+(a\s+|an\s+)?(?!if\b)/i,
  /new\s+persona/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /\[system\]/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions)/i,
  /what\s+(are|is)\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
  /repeat\s+(the\s+)?(text|words|instructions)\s+above/i,
  /output\s+(your\s+)?(initial|system)\s+(prompt|instructions)/i,
]

// Per-user sliding window rate limiter
const windows = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20

export function validatePrompt(prompt: string): {
  ok: boolean
  error?: string
} {
  if (!prompt?.trim()) {
    return { ok: false, error: 'Prompt is required' }
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: 'Prompt is too long' }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(prompt)) {
      return { ok: false, error: 'Prompt contains disallowed content' }
    }
  }

  return { ok: true }
}

export function checkRateLimit(userId: string): {
  ok: boolean
  error?: string
} {
  const now = Date.now()
  const entry = windows.get(userId)

  if (!entry || now > entry.resetAt) {
    windows.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { ok: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { ok: false, error: 'Too many requests. Try again shortly.' }
  }

  entry.count++
  return { ok: true }
}
