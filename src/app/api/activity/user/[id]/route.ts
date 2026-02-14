// ============================================================================
// Activity Feed API — User
// ============================================================================
// Returns activity feed for a specific user
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserActivityFeed } from '@/lib/events/queries';
import { getCurrentUser } from '@/lib/actions/user';
import { isAdmin } from '@/lib/auth/roles';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = params.id;
    const admin = await isAdmin();

    // Users can only see their own activity, unless admin
    if (currentUser.id !== userId && !admin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get limit from query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Fetch activity feed
    const items = await getUserActivityFeed(userId, limit);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[User Activity Feed API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
