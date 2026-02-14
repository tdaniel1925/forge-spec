/**
 * Automation Event Listener
 * Stage 6 — Automation (Layer 5)
 *
 * Listens to events from Stage 5 (Layer 4) and triggers automation rules.
 * Can be used in API routes or background workers.
 */

import type { Event } from '@/types/events';
import type { AutomationPayload } from '@/types/automation';
import { getAutomationRulesByEventType } from './registry';
import { executeAutomationBackground } from './executor';

/**
 * Process an event and trigger matching automation rules
 */
export async function processEvent(event: Event): Promise<void> {
  // Get all automation rules that match this event type
  const rules = getAutomationRulesByEventType(event.event_type);

  if (rules.length === 0) {
    // No automation rules for this event type
    return;
  }

  // Prepare automation payload from event
  const payload: AutomationPayload = {
    eventId: event.id,
    eventType: event.event_type,
    entityType: event.entity_type,
    entityId: event.entity_id,
    actorId: event.actor_id,
    data: event.payload as Record<string, unknown>,
  };

  // Execute all matching automation rules in background (fire-and-forget)
  for (const rule of rules) {
    executeAutomationBackground(rule, payload);
  }
}

/**
 * Process a batch of events (useful for catch-up or bulk processing)
 */
export async function processBatch(events: Event[]): Promise<void> {
  for (const event of events) {
    await processEvent(event);
  }
}

/**
 * Subscribe to events in real-time (for use in background worker)
 * This would typically run in a separate process or Supabase edge function
 */
export async function subscribeToEvents(
  supabase: any,
  callback?: (event: Event) => void
): Promise<void> {
  const subscription = supabase
    .channel('events')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
      },
      (payload: any) => {
        const event = payload.new as Event;
        processEvent(event);
        if (callback) {
          callback(event);
        }
      }
    )
    .subscribe();

  console.log('[Automation Listener] Subscribed to events');

  return subscription;
}
