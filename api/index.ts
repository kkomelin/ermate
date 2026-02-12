import { Hono } from 'hono'
import { chatRoute } from './routes/chat'
import { authMiddleware } from './middleware/auth'

const app = new Hono().basePath('/api')

app.use('*', authMiddleware())
app.route('/chat', chatRoute)

export default app
