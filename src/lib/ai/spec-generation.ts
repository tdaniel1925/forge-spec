/**
 * Spec Generation - Implements State Changes #20-22
 * Generates complete PROJECT-SPEC.md from research results
 */

import { sendMessage, calculateCost, MODELS } from './claude';
import { SPEC_GENERATION_PROMPT, SPEC_VALIDATION_PROMPT } from './prompts';
import type { Message } from './claude';

export interface SpecGenerationResult {
  full_spec_markdown: string;
  gate_0: any;
  gate_1: any;
  gate_2: any;
  gate_3: any;
  gate_4: any;
  gate_5: any;
  entity_count: number;
  state_change_count: number;
  recommended_stack: any;
  complexity_rating: 'simple' | 'moderate' | 'complex' | 'enterprise';
  estimated_build_hours_min: number;
  estimated_build_hours_max: number;
  cost: number;
}

export interface ValidationResult {
  spec_quality_score: number;
  validation_errors: Array<{
    gate: string;
    issue: string;
    severity: 'error' | 'warning';
  }>;
  auto_fix_suggestions: string[];
}

/**
 * Generate complete PROJECT-SPEC.md from research
 * State Change #20
 */
export async function generateSpec(
  researchReport: any,
  chatHistory: any[],
  integrationRequirements?: string
): Promise<SpecGenerationResult> {
  const context = `
# Research Results

## Phase 1: Domain Analysis
${JSON.stringify(researchReport.domain_summary, null, 2)}

Competitors:
${JSON.stringify(researchReport.competitor_analysis, null, 2)}

## Phase 2: Feature Decomposition
${JSON.stringify(researchReport.feature_decomposition, null, 2)}

## Phase 3: Technical Requirements
${JSON.stringify(researchReport.technical_requirements, null, 2)}

## Phase 4: Competitive Gaps
${JSON.stringify(researchReport.competitive_gaps, null, 2)}

# Chat History
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n\n')}

# Integration Requirements
${integrationRequirements || 'None specified'}
`;

  const messages: Message[] = [
    {
      role: 'user',
      content: `Generate a complete PROJECT-SPEC.md for this app based on the research:\n\n${context}`,
    },
  ];

  const response = await sendMessage(
    messages,
    SPEC_GENERATION_PROMPT,
    MODELS.SPEC_GENERATION,
    16000 // Large token limit for full spec
  );

  const cost = calculateCost(response.usage, MODELS.SPEC_GENERATION);

  // Parse the generated spec
  const markdown = response.content;

  // Extract gates from markdown (simplified - in production would parse more robustly)
  const gates = extractGatesFromMarkdown(markdown);

  // Calculate metrics
  const entityCount = gates.gate_1?.entities?.length || 0;
  const stateChangeCount = gates.gate_2?.state_changes?.length || 0;

  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' | 'enterprise' = 'moderate';
  if (entityCount <= 3) complexity = 'simple';
  else if (entityCount <= 8) complexity = 'moderate';
  else if (entityCount <= 15) complexity = 'complex';
  else complexity = 'enterprise';

  return {
    full_spec_markdown: markdown,
    gate_0: gates.gate_0 || {},
    gate_1: gates.gate_1 || {},
    gate_2: gates.gate_2 || {},
    gate_3: gates.gate_3 || {},
    gate_4: gates.gate_4 || {},
    gate_5: gates.gate_5 || {},
    entity_count: entityCount,
    state_change_count: stateChangeCount,
    recommended_stack: researchReport.technical_requirements?.recommended_stack || {},
    complexity_rating: complexity,
    estimated_build_hours_min: researchReport.technical_requirements?.estimates?.build_hours_min || 40,
    estimated_build_hours_max: researchReport.technical_requirements?.estimates?.build_hours_max || 80,
    cost,
  };
}

/**
 * Validate generated spec
 * State Change #20b
 */
export async function validateSpec(
  generatedSpec: string
): Promise<ValidationResult> {
  const messages: Message[] = [
    {
      role: 'user',
      content: `Validate this PROJECT-SPEC.md:\n\n${generatedSpec.substring(0, 20000)}`, // Limit to avoid token overflow
    },
  ];

  const response = await sendMessage(
    messages,
    SPEC_VALIDATION_PROMPT,
    MODELS.VALIDATION
  );

  // Parse JSON response
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      spec_quality_score: 50,
      validation_errors: [
        {
          gate: 'All',
          issue: 'Could not parse validation results',
          severity: 'error',
        },
      ],
      auto_fix_suggestions: ['Regenerate spec'],
    };
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    spec_quality_score: result.spec_quality_score || 0,
    validation_errors: result.validation_errors || [],
    auto_fix_suggestions: result.auto_fix_suggestions || [],
  };
}

/**
 * Extract gates from markdown (simplified parser)
 */
function extractGatesFromMarkdown(markdown: string): any {
  const gates: any = {};

  // Extract each gate section
  const gate0Match = markdown.match(/# GATE 0[\s\S]*?(?=# GATE 1|$)/);
  const gate1Match = markdown.match(/# GATE 1[\s\S]*?(?=# GATE 2|$)/);
  const gate2Match = markdown.match(/# GATE 2[\s\S]*?(?=# GATE 3|$)/);
  const gate3Match = markdown.match(/# GATE 3[\s\S]*?(?=# GATE 4|$)/);
  const gate4Match = markdown.match(/# GATE 4[\s\S]*?(?=# GATE 5|$)/);
  const gate5Match = markdown.match(/# GATE 5[\s\S]*?(?=# |$)/);

  gates.gate_0 = gate0Match ? { content: gate0Match[0] } : {};
  gates.gate_1 = gate1Match ? { content: gate1Match[0] } : {};
  gates.gate_2 = gate2Match ? { content: gate2Match[0] } : {};
  gates.gate_3 = gate3Match ? { content: gate3Match[0] } : {};
  gates.gate_4 = gate4Match ? { content: gate4Match[0] } : {};
  gates.gate_5 = gate5Match ? { content: gate5Match[0] } : {};

  // Count entities and state changes (simple approach)
  if (gate1Match) {
    const entityMatches = gate1Match[0].match(/^\| \w+/gm);
    gates.gate_1.entities = entityMatches || [];
  }

  if (gate2Match) {
    const stateMatches = gate2Match[0].match(/^\| \d+/gm);
    gates.gate_2.state_changes = stateMatches || [];
  }

  return gates;
}
