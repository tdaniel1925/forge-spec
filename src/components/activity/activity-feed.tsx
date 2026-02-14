// ============================================================================
// Activity Feed Component — Stage 5
// ============================================================================
// Displays a read-only feed of events for a spec project or user.
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import type { ActivityFeedItem } from '@/types/events';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Activity Feed Item Component
// ============================================================================

interface ActivityFeedItemProps {
  item: ActivityFeedItem;
}

function ActivityFeedItemComponent({ item }: ActivityFeedItemProps) {
  // Format timestamp
  const timestamp = new Date(item.timestamp);
  const isRecent = Date.now() - timestamp.getTime() < 60 * 1000; // Last minute
  const timeAgo = getTimeAgo(timestamp);

  return (
    <div className="flex gap-4 p-4 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg">
        {item.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-900 font-medium">
          {item.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-neutral-500">
            {item.actor_name || 'System'}
          </span>
          <span className="text-xs text-neutral-400">•</span>
          <span className="text-xs text-neutral-500">{timeAgo}</span>
          {isRecent && (
            <Badge className="ml-2 bg-primary text-white text-xs px-2 py-0">
              New
            </Badge>
          )}
        </div>
      </div>

      {/* Event Type Badge */}
      <div className="flex-shrink-0">
        <Badge className="bg-neutral-100 text-neutral-700 text-xs">
          {item.entity_type}
        </Badge>
      </div>
    </div>
  );
}

// ============================================================================
// Activity Feed Container
// ============================================================================

interface ActivityFeedProps {
  items: ActivityFeedItem[];
  loading?: boolean;
  emptyMessage?: string;
}

export function ActivityFeed({
  items,
  loading = false,
  emptyMessage = 'No activity yet',
}: ActivityFeedProps) {
  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-neutral-600">Loading activity...</span>
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-neutral-500 text-sm">
          {emptyMessage}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-neutral-200">
        {items.map((item) => (
          <ActivityFeedItemComponent key={item.id} item={item} />
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// Spec Project Activity Feed (with data fetching)
// ============================================================================

interface SpecProjectActivityFeedProps {
  specProjectId: string;
  limit?: number;
}

export function SpecProjectActivityFeed({
  specProjectId,
  limit = 50,
}: SpecProjectActivityFeedProps) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/activity/spec-project/${specProjectId}?limit=${limit}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch activity');
        }

        const data = await response.json();
        setItems(data.items || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [specProjectId, limit]);

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center text-red-600 text-sm">
          Failed to load activity: {error}
        </div>
      </Card>
    );
  }

  return <ActivityFeed items={items} loading={loading} />;
}

// ============================================================================
// User Activity Feed (with data fetching)
// ============================================================================

interface UserActivityFeedProps {
  userId: string;
  limit?: number;
}

export function UserActivityFeed({ userId, limit = 50 }: UserActivityFeedProps) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true);
        const response = await fetch(`/api/activity/user/${userId}?limit=${limit}`);

        if (!response.ok) {
          throw new Error('Failed to fetch activity');
        }

        const data = await response.json();
        setItems(data.items || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [userId, limit]);

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center text-red-600 text-sm">
          Failed to load activity: {error}
        </div>
      </Card>
    );
  }

  return <ActivityFeed items={items} loading={loading} />;
}

// ============================================================================
// Helpers
// ============================================================================

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

// ============================================================================
// End of Activity Feed Component
// ============================================================================
