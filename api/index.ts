import { authMiddleware } from '@api/middleware/auth'
import { chatRoute } from '@api/routes/chat'
import { Hono } from 'hono'

const app = new Hono().basePath('/api')

app.use('*', authMiddleware())
app.route('/chat', chatRoute)

export default app
