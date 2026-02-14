// ============================================================================
// Activity Feed API — Spec Project
// ============================================================================
// Returns activity feed for a specific spec project
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSpecProjectActivityFeed } from '@/lib/events/queries';
import { getCurrentUser } from '@/lib/actions/user';
import { getSpecProjectById } from '@/lib/actions/spec_project';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const specProjectId = params.id;

    // Check if user owns this spec project
    const { data: specProject, error: specError } = await getSpecProjectById(
      specProjectId
    );

    if (specError || !specProject) {
      return NextResponse.json(
        { error: 'Spec project not found or access denied' },
        { status: 404 }
      );
    }

    // Get limit from query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Fetch activity feed
    const items = await getSpecProjectActivityFeed(specProjectId, limit);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Activity Feed API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
