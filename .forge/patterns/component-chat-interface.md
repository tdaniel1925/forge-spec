# PATTERN: Chat Interface
# Use for: AI conversation UI with message bubbles, typing indicator, streaming.
# Apply in: Stage 4+ (any AI chat feature)

## Implementation

```typescript
// src/components/chat/chat-interface.tsx
"use client"

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  messages: Message[]
  onSend: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function ChatInterface({ messages, onSend, isLoading = false, placeholder = "Describe what you want to build..." }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-muted-foreground/50"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="h-2 w-2 rounded-full bg-muted-foreground/50"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="h-2 w-2 rounded-full bg-muted-foreground/50"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Bar */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## Streaming Support
For streaming AI responses, update the last assistant message in real-time:
```typescript
// In your chat hook
const [streamingContent, setStreamingContent] = useState("")

// During stream
const reader = response.body?.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  setStreamingContent(prev => prev + new TextDecoder().decode(value))
}
```

## Layout Integration
The chat should fill its container. Use in a page like:
```typescript
<div className="h-[calc(100vh-4rem)]"> {/* subtract topbar height */}
  <ChatInterface messages={messages} onSend={handleSend} isLoading={isLoading} />
</div>
```
