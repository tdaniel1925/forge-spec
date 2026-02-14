/**
 * Generate API Route - Generates the final PROJECT-SPEC.md
 * State Changes #20-22
 *
 * This route:
 * 1. Takes research results
 * 2. Generates complete PROJECT-SPEC.md
 * 3. Validates the spec
 * 4. Auto-fixes if needed
 * 5. Updates spec_project status to 'review'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSpecProjectById, updateSpecProjectStatus } from '@/lib/actions/spec_project';
import { getResearchReportBySpecProject } from '@/lib/actions/research_report';
import { getAllChatMessages } from '@/lib/actions/chat_message';
import {
  createGeneratedSpec,
  updateGeneratedSpec,
  markSpecComplete,
  markSpecFailed,
  updateValidationResults,
} from '@/lib/actions/generated_spec';
import { generateSpec, validateSpec } from '@/lib/ai/spec-generation';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes max

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
    const { specId, integrations } = body;

    if (!specId) {
      return NextResponse.json({ error: 'Missing specId' }, { status: 400 });
    }

    // Verify spec ownership
    const spec = await getSpecProjectById(specId);
    if (!spec || spec.user_id !== user.id) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    // Get research report
    const research = await getResearchReportBySpecProject(specId);
    if (!research || research.research_status !== 'complete') {
      return NextResponse.json(
        { error: 'Research not complete' },
        { status: 400 }
      );
    }

    // Get chat history
    const chatHistory = await getAllChatMessages(specId);

    // Update spec_project to generating
    await updateSpecProjectStatus(specId, 'generating');

    // Create generated_spec record (State Change #20)
    const genSpec = await createGeneratedSpec({
      spec_project_id: specId,
      spec_status: 'generating',
      gate_0: {},
      gate_1: {},
      gate_2: {},
      gate_3: {},
      gate_4: {},
      gate_5: {},
      full_spec_markdown: '',
      entity_count: 0,
      state_change_count: 0,
      spec_quality_score: 0,
    });

    try {
      // Generate spec (State Change #20)
      const result = await generateSpec(research, chatHistory, integrations);

      // Update generated_spec with results
      await updateGeneratedSpec(genSpec.id, {
        full_spec_markdown: result.full_spec_markdown,
        gate_0: result.gate_0,
        gate_1: result.gate_1,
        gate_2: result.gate_2,
        gate_3: result.gate_3,
        gate_4: result.gate_4,
        gate_5: result.gate_5,
        entity_count: result.entity_count,
        state_change_count: result.state_change_count,
        recommended_stack: result.recommended_stack,
        complexity_rating: result.complexity_rating,
        estimated_build_hours_min: result.estimated_build_hours_min,
        estimated_build_hours_max: result.estimated_build_hours_max,
        generation_cost_usd: result.cost,
      });

      // Validate spec (State Change #20b)
      const validation = await validateSpec(result.full_spec_markdown);

      // Update validation results
      await updateValidationResults(
        genSpec.id,
        validation.spec_quality_score,
        validation.validation_errors
      );

      // If quality is too low, mark as failed
      if (validation.spec_quality_score < 60) {
        await markSpecFailed(genSpec.id);
        return NextResponse.json({
          error: 'Spec quality too low',
          score: validation.spec_quality_score,
          errors: validation.validation_errors,
          suggestions: validation.auto_fix_suggestions,
        }, { status: 400 });
      }

      // Mark spec complete (State Change #21)
      await markSpecComplete(genSpec.id, result.cost);

      // Update spec_project to review
      await updateSpecProjectStatus(specId, 'review');

      return NextResponse.json({
        success: true,
        specId: genSpec.id,
        qualityScore: validation.spec_quality_score,
        entityCount: result.entity_count,
        stateChangeCount: result.state_change_count,
        complexity: result.complexity_rating,
        estimatedHours: {
          min: result.estimated_build_hours_min,
          max: result.estimated_build_hours_max,
        },
      });
    } catch (error) {
      console.error('Spec generation error:', error);

      // Mark failed (State Change #22)
      await markSpecFailed(genSpec.id);

      return NextResponse.json(
        {
          error: 'Spec generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
