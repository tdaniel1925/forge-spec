// Entity Type: chat_message
// From PROJECT-SPEC.md Gate 1
// Owner: user | Parent: spec_project | States: none (append-only)

import type { ChatMessage as DBChatMessage, ChatRole } from './database';

export type { ChatRole };

export interface ChatMessage extends DBChatMessage {}

// Insert type
export type ChatMessageInsert = Omit<
  ChatMessage,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Metadata structure for chat messages
export interface ChatMessageMetadata {
  research_citations?: string[];
  phase_marker?: 'phase_1' | 'phase_2' | 'phase_3' | 'phase_4';
  progress_percentage?: number;
  [key: string]: unknown;
}

// Display type (for rendering in UI)
export interface ChatMessageDisplay {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  metadata?: ChatMessageMetadata;
}
