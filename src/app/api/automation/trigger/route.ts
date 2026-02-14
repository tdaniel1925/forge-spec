/**
 * Manual Automation Trigger
 * Stage 6 — Automation (Layer 5)
 *
 * Manually trigger automation rules (for testing and admin use).
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAutomationRule } from '@/lib/automation';
import { executeAutomation } from '@/lib/automation';
import type { AutomationPayload } from '@/types/automation';

export async function POST(request: NextRequest) {
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

    // Get rule name and payload from body
    const body = await request.json();
    const { rule_name, payload } = body;

    if (!rule_name) {
      return NextResponse.json(
        { error: 'rule_name is required' },
        { status: 400 }
      );
    }

    // Get automation rule
    const rule = getAutomationRule(rule_name);

    if (!rule) {
      return NextResponse.json(
        { error: `Automation rule ${rule_name} not found` },
        { status: 404 }
      );
    }

    // Execute automation
    const automationPayload: AutomationPayload = payload || { data: {} };
    const result = await executeAutomation(rule, automationPayload);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
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
    console.error('[Automation Trigger] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
