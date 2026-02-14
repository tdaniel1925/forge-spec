/**
 * Research API Route - Runs the 4-phase research pipeline
 * State Changes #8-19
 *
 * This is a long-running operation that:
 * 1. Runs 4 research phases sequentially
 * 2. Uses web search extensively
 * 3. Updates research_report in database as it progresses
 * 4. Streams progress updates to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSpecProjectById } from '@/lib/actions/spec_project';
import { getAllChatMessages } from '@/lib/actions/chat_message';
import {
  createResearchReport,
  updateResearchPhase,
  markResearchComplete,
  markResearchFailed,
} from '@/lib/actions/research_report';
import { runFullResearch } from '@/lib/ai/research';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

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
    const { specId } = body;

    if (!specId) {
      return NextResponse.json({ error: 'Missing specId' }, { status: 400 });
    }

    // Verify spec ownership and status
    const spec = await getSpecProjectById(specId);
    if (!spec || spec.user_id !== user.id) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    if (spec.status !== 'researching') {
      return NextResponse.json(
        { error: 'Spec is not in researching state' },
        { status: 400 }
      );
    }

    // Get app description from chat history
    const chatHistory = await getAllChatMessages(specId);
    const appDescription =
      chatHistory
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n') || 'No description provided';

    // Create research report (State Change #8)
    const researchReport = await createResearchReport({
      spec_project_id: specId,
      research_status: 'generating',
      domain_summary: '',
      competitor_analysis: {},
      feature_decomposition: {},
      technical_requirements: {},
      competitive_gaps: {},
      raw_search_results: {},
    });

    // Stream progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Run research pipeline
          const results = await runFullResearch(appDescription, progress => {
            // Send progress update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  phase: progress.phase,
                  status: progress.status,
                  message: progress.message,
                })}\n\n`
              )
            );
          });

          // Update research report with all results
          // Phase 1
          await updateResearchPhase(researchReport.id, {
            research_status: 'phase_1',
            domain_summary: results.phase_1.domain_summary,
            competitor_analysis: results.phase_1.competitor_analysis,
            raw_search_results: {
              ...researchReport.raw_search_results,
              phase_1: results.phase_1.raw_search_results,
            },
          });

          // Phase 2
          await updateResearchPhase(researchReport.id, {
            research_status: 'phase_2',
            feature_decomposition: results.phase_2.feature_areas,
            raw_search_results: {
              ...researchReport.raw_search_results,
              phase_2: [],
            },
          });

          // Phase 3
          await updateResearchPhase(researchReport.id, {
            research_status: 'phase_3',
            technical_requirements: {
              component_requirements: results.phase_3.component_requirements,
              compliance: results.phase_3.compliance,
              recommended_stack: results.phase_3.recommended_stack,
              estimates: results.phase_3.estimates,
            },
          });

          // Phase 4
          await updateResearchPhase(researchReport.id, {
            research_status: 'phase_4',
            competitive_gaps: results.phase_4,
          });

          // Mark complete (State Change #19)
          await markResearchComplete(researchReport.id, results.total_cost);

          // Send completion signal
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                phase: 4,
                status: 'complete',
                message: 'Research complete!',
                reportId: researchReport.id,
                totalCost: results.total_cost,
              })}\n\n`
            )
          );

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error('Research error:', error);

          // Mark failed
          await markResearchFailed(researchReport.id);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: 'Research failed',
                message: error instanceof Error ? error.message : 'Unknown error',
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
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
