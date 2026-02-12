import { Hono } from 'hono'
import { chatRoute } from './routes/chat.js'
import { authMiddleware } from './middleware/auth.js'

const app = new Hono().basePath('/api')

app.use('*', authMiddleware())
app.route('/chat', chatRoute)

export default app
