'use client';

/**
 * Chat Interface Component
 * Used for spec generation conversation
 * Handles message display, input, and streaming responses
 */

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  specId: string;
  initialMessages: Message[];
  onResearchStart?: () => void;
}

export function ChatInterface({
  specId,
  initialMessages,
  onResearchStart,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // Add completed assistant message
              const assistantMsg: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: accumulatedContent,
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, assistantMsg]);
              setStreamingMessage('');
              setIsLoading(false);
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.action === 'start_research') {
                // Research triggered
                onResearchStart?.();
              } else if (parsed.content) {
                accumulatedContent += parsed.content;
                setStreamingMessage(accumulatedContent);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (err) {
              // Not JSON, skip
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-[#FF7F50] to-[#FF6347] text-white rounded-br-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-5 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm">
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {streamingMessage}
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && !streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-5 py-3 bg-neutral-100 dark:bg-neutral-800">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '200ms' }} />
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your app idea..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-[#FF7F50] to-[#FF6347] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
