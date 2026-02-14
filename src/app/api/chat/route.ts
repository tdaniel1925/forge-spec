/**
 * Chat API Route - Handles spec generation conversation
 * State Change #7: user → describes app → chat_message created, AI analyzes
 *
 * This route:
 * 1. Receives user message
 * 2. Stores it as chat_message
 * 3. Streams AI response back
 * 4. Stores AI response as chat_message
 * 5. Detects if enough context gathered → triggers research
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createChatMessage, getAllChatMessages } from '@/lib/actions/chat_message';
import { getSpecProjectById, updateSpecProjectStatus } from '@/lib/actions/spec_project';
import { sendChatMessage, MODELS } from '@/lib/ai/claude';
import { CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { specId, message } = body;

    if (!specId || !message) {
      return NextResponse.json(
        { error: 'Missing specId or message' },
        { status: 400 }
      );
    }

    // Verify spec ownership
    const spec = await getSpecProjectById(specId);
    if (!spec || spec.user_id !== user.id) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    // Only allow chat if status is 'chatting'
    if (spec.status !== 'chatting') {
      return NextResponse.json(
        { error: 'Spec is not in chatting state' },
        { status: 400 }
      );
    }

    // Store user message (State Change #7)
    await createChatMessage({
      spec_project_id: specId,
      role: 'user',
      content: message,
      metadata: {},
    });

    // Get full conversation history
    const chatHistory = await getAllChatMessages(specId);
    const messages = chatHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Stream AI response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let assistantMessage = '';

        try {
          // Generate AI response
          for await (const chunk of sendChatMessage(messages, CHAT_SYSTEM_PROMPT)) {
            if (chunk.type === 'text') {
              assistantMessage += chunk.content;
              // Send chunk to client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
              );
            } else if (chunk.type === 'done') {
              // Check if AI signals readiness for research
              const isReady = assistantMessage
                .toLowerCase()
                .includes('i have enough context to begin research');

              // Store assistant message
              await createChatMessage({
                spec_project_id: specId,
                role: 'assistant',
                content: assistantMessage,
                metadata: { ready_for_research: isReady },
              });

              // If ready, trigger research (State Change #8)
              if (isReady) {
                await updateSpecProjectStatus(specId, 'researching');

                // Send signal to start research
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      content: '',
                      action: 'start_research'
                    })}\n\n`
                  )
                );
              }

              // Send done signal
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          }
        } catch (error) {
          console.error('Chat stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: 'Failed to generate response'
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
