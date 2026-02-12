import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { LoaderIcon, SendIcon, SparklesIcon, WifiOffIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useSchemaPrompt } from '@/hooks/useSchemaPrompt'
import { SignInButton, useUser } from '@clerk/clerk-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function getOnline() {
  return navigator.onLine
}

export function PromptBar() {
  const { isSignedIn } = useUser()
  const { submit, isLoading, lastMessage } = useSchemaPrompt()
  const isOnline = useSyncExternalStore(subscribeOnline, getOnline)
  const [value, setValue] = useState('create users database with name, email, and password')
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMessageRef = useRef<string | null>(null)

  // Show toast when AI responds
  useEffect(() => {
    if (lastMessage && lastMessage !== prevMessageRef.current) {
      prevMessageRef.current = lastMessage
      const opts = { duration: 10000, closeButton: true }
      if (lastMessage.toLowerCase().includes('wrong')) {
        toast.error(lastMessage, opts)
      } else {
        toast.success(lastMessage, opts)
      }
    }
  }, [lastMessage])

  // Auto-focus when signed in
  useEffect(() => {
    if (isSignedIn) {
      inputRef.current?.focus()
    }
  }, [isSignedIn])

  const handleSubmit = useCallback(async () => {
    if (!isSignedIn) return
    const trimmed = value.trim()
    if (!trimmed || isLoading || !isOnline) return
    const success = await submit(trimmed)
    if (success) {
      setValue('')
    }
  }, [value, isLoading, isOnline, submit, isSignedIn])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const disabled = !isOnline || isLoading

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <div className="border-border bg-card/95 pointer-events-auto flex w-full max-w-[600px] items-center gap-2 rounded-lg border p-2 shadow-lg backdrop-blur-sm transition-shadow focus-within:shadow-xl">
        {/* AI indicator */}
        <div className="text-muted-foreground flex shrink-0 items-center pl-0.5">
          {!isOnline ? (
            <WifiOffIcon className="size-4" />
          ) : isLoading ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || !isSignedIn}
          placeholder={
            !isOnline
              ? 'AI requires an internet connection'
              : !isSignedIn
                ? 'Sign in to use AI features'
                : isLoading
                  ? 'Working on it...'
                  : 'Describe a schema change...'
          }
          className="text-foreground placeholder:text-muted-foreground h-7 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* Submit button */}
        {isSignedIn ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            aria-label="Send prompt"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-7 shrink-0 items-center justify-center rounded-md transition-opacity disabled:pointer-events-none disabled:opacity-30"
          >
            {isLoading ? (
              <LoaderIcon className="size-3.5 animate-spin" />
            ) : (
              <SendIcon className="size-3.5" />
            )}
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-opacity"
                >
                  Sign In
                </button>
              </SignInButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sign in to unlock the ai design</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
