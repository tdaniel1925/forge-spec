/**
 * Automation Cron Endpoint
 * Stage 6 — Automation (Layer 5)
 *
 * Runs scheduled jobs (Rules #7, #8, #9, #10).
 * Should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScheduledJob } from '@/lib/automation';

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const secret = authHeader?.replace('Bearer ', '');

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get job name from body
    const body = await request.json().catch(() => ({}));
    const { job_name } = body;

    if (!job_name) {
      return NextResponse.json(
        { error: 'job_name is required' },
        { status: 400 }
      );
    }

    // Run the job
    const result = await runScheduledJob(job_name);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Automation Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Also support GET for simple health checks
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = authHeader?.replace('Bearer ', '');

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
