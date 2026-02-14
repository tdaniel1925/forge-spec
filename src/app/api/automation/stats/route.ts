/**
 * Automation Stats API
 * Stage 6 — Automation (Layer 5)
 *
 * View automation execution statistics.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAutomationStats } from '@/lib/automation';
import { getScheduledJobs } from '@/lib/automation';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Verify user is authenticated and is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get automation stats
    const stats = await getAutomationStats();
    const jobs = await getScheduledJobs();

    return NextResponse.json({
      stats,
      scheduled_jobs: jobs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Automation Stats] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
