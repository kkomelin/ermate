import { clerkMiddleware } from '@clerk/hono'

export const authMiddleware = () =>
  clerkMiddleware({
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })
