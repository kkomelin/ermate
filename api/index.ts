import { Hono } from 'hono'
import { chatRoute } from './routes/chat.ts'
import { authMiddleware } from './middleware/auth.ts'

const app = new Hono().basePath('/api')

app.use('*', authMiddleware())
app.route('/chat', chatRoute)

export default app
