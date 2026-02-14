/**
 * AI Context Assembly System
 * Stage 7: Gather events + entity state for AI reasoning
 *
 * AI reads from events (Stage 5) and entities (Stage 3) but NEVER writes directly.
 * All AI output flows through CRUD actions.
 */

import { getEventsByEntity, getEventsByType, getEventsByTimeRange } from '../events/queries';
import { createSupabaseServerClient } from '../supabase/server';
import type { Database } from '@/types/database';

export interface EntityContext {
  entityType: string;
  entityId: string;
  currentState: any;
  relatedEntities: Array<{
    type: string;
    id: string;
    state: any;
  }>;
}

export interface EventContext {
  recentEvents: any[];
  relatedEvents: any[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface AIContext {
  entity?: EntityContext;
  events?: EventContext;
  user?: {
    id: string;
    role: string;
    metadata: any;
  };
  timestamp: Date;
}

/**
 * Assemble context for AI reasoning about a specific entity
 */
export async function assembleEntityContext(
  entityType: string,
  entityId: string,
  options?: {
    includeRelated?: boolean;
    includeEvents?: boolean;
    eventLimit?: number;
  }
): Promise<EntityContext> {
  const supabase = await createSupabaseServerClient();

  // Fetch current entity state from database
  const { data: entity, error } = await supabase
    .from(entityType as any)
    .select('*')
    .eq('id', entityId)
    .single();

  if (error || !entity) {
    throw new Error(`Entity not found: ${entityType}/${entityId}`);
  }

  const context: EntityContext = {
    entityType,
    entityId,
    currentState: entity,
    relatedEntities: [],
  };

  // Optionally include related entities
  if (options?.includeRelated) {
    context.relatedEntities = await fetchRelatedEntities(entityType, entity);
  }

  return context;
}

/**
 * Assemble event context for AI reasoning
 */
export async function assembleEventContext(
  options: {
    entityType?: string;
    entityId?: string;
    eventTypes?: string[];
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }
): Promise<EventContext> {
  const limit = options.limit || 50;

  let events: any[] = [];

  // Fetch events based on filters
  if (options.entityId) {
    events = await getEventsByEntity(options.entityType!, options.entityId, limit);
  } else if (options.eventTypes && options.eventTypes.length > 0) {
    const allEvents = await Promise.all(
      options.eventTypes.map((type) => getEventsByType(type, limit))
    );
    events = allEvents.flat().sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, limit);
  } else if (options.timeRange) {
    events = await getEventsByTimeRange(options.timeRange.start, options.timeRange.end, limit);
  }

  return {
    recentEvents: events,
    relatedEvents: [], // Could be expanded with graph traversal
    timeRange: options.timeRange || {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date(),
    },
  };
}

/**
 * Assemble full AI context for a spec project
 * This is commonly used for AI features in the primary workflow
 */
export async function assembleSpecProjectContext(
  specProjectId: string,
  userId: string
): Promise<AIContext> {
  const supabase = await createSupabaseServerClient();

  // Fetch spec project
  const entityContext = await assembleEntityContext('spec_projects', specProjectId, {
    includeRelated: true,
    includeEvents: true,
  });

  // Fetch recent events for this spec project
  const eventContext = await assembleEventContext({
    entityType: 'spec_project',
    entityId: specProjectId,
    limit: 100,
  });

  // Fetch user context
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('id', userId)
    .single();

  return {
    entity: entityContext,
    events: eventContext,
    user: user || undefined,
    timestamp: new Date(),
  };
}

/**
 * Fetch related entities based on Gate 4 relationships
 */
async function fetchRelatedEntities(
  entityType: string,
  entity: any
): Promise<Array<{ type: string; id: string; state: any }>> {
  const supabase = await createSupabaseServerClient();
  const related: Array<{ type: string; id: string; state: any }> = [];

  // Define relationships from Gate 4
  const relationships: Record<string, string[]> = {
    spec_projects: ['chat_messages', 'research_reports', 'generated_specs', 'spec_downloads'],
    users: ['spec_projects', 'feedbacks'],
    // Add more as needed
  };

  const relatedTypes = relationships[entityType] || [];

  for (const relatedType of relatedTypes) {
    // Determine foreign key based on relationship
    const fkField = `${entityType.slice(0, -1)}_id`; // e.g., spec_project_id

    const { data } = await supabase
      .from(relatedType as any)
      .select('*')
      .eq(fkField as any, entity.id)
      .limit(10);

    if (data) {
      related.push(
        ...data.map((item) => ({
          type: relatedType,
          id: item.id,
          state: item,
        }))
      );
    }
  }

  return related;
}

/**
 * Format context for AI prompt
 */
export function formatContextForPrompt(context: AIContext): string {
  let prompt = `# Current Context (as of ${context.timestamp.toISOString()})\n\n`;

  if (context.user) {
    prompt += `## User\n`;
    prompt += `- ID: ${context.user.id}\n`;
    prompt += `- Role: ${context.user.role}\n\n`;
  }

  if (context.entity) {
    prompt += `## Entity: ${context.entity.entityType}\n`;
    prompt += `- ID: ${context.entity.entityId}\n`;
    prompt += `- Current State:\n\`\`\`json\n${JSON.stringify(context.entity.currentState, null, 2)}\n\`\`\`\n\n`;

    if (context.entity.relatedEntities.length > 0) {
      prompt += `## Related Entities (${context.entity.relatedEntities.length})\n`;
      for (const rel of context.entity.relatedEntities.slice(0, 5)) {
        prompt += `- ${rel.type}/${rel.id}\n`;
      }
      prompt += '\n';
    }
  }

  if (context.events && context.events.recentEvents.length > 0) {
    prompt += `## Recent Events (${context.events.recentEvents.length})\n`;
    for (const event of context.events.recentEvents.slice(0, 10)) {
      prompt += `- ${event.event_type} by ${event.actor_id} at ${event.created_at}\n`;
      if (event.payload) {
        prompt += `  ${JSON.stringify(event.payload).substring(0, 100)}...\n`;
      }
    }
    prompt += '\n';
  }

  return prompt;
}
