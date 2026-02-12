import app from '@api/index'
import { serve } from '@hono/node-server'

const port = 3001

console.log(`API dev server running on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
