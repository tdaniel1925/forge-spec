/**
 * Research Pipeline - Implements State Changes #9-19
 * Four-phase deep research process with web search
 */

import { sendMessageWithSearch, calculateCost, MODELS } from './claude';
import {
  RESEARCH_PHASE_1_PROMPT,
  RESEARCH_PHASE_2_PROMPT,
  RESEARCH_PHASE_3_PROMPT,
  RESEARCH_PHASE_4_PROMPT,
} from './prompts';
import type { Message } from './claude';

export interface ResearchProgress {
  phase: 1 | 2 | 3 | 4;
  status: 'in_progress' | 'complete' | 'failed';
  message: string;
}

export type ResearchProgressCallback = (progress: ResearchProgress) => void;

/**
 * Run Phase 1: Domain Analysis
 * State Changes #9-11
 */
export async function runPhase1(
  appDescription: string,
  onProgress?: ResearchProgressCallback
): Promise<{
  domain_summary: string;
  competitor_analysis: any[];
  user_personas: string[];
  compliance_requirements: string[];
  raw_search_results: any;
  cost: number;
}> {
  onProgress?.({
    phase: 1,
    status: 'in_progress',
    message: 'Analyzing domain and researching competitors...',
  });

  const messages: Message[] = [
    {
      role: 'user',
      content: `Perform Phase 1 research for this app:\n\n${appDescription}\n\nReturn your findings as JSON matching the specified format.`,
    },
  ];

  const response = await sendMessageWithSearch(
    messages,
    RESEARCH_PHASE_1_PROMPT,
    MODELS.RESEARCH
  );

  // Parse JSON response
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    domain_summary: response.content,
    competitor_analysis: [],
    user_personas: [],
    compliance_requirements: [],
  };

  const cost = calculateCost(response.usage, MODELS.RESEARCH);

  onProgress?.({
    phase: 1,
    status: 'complete',
    message: `Found ${result.competitor_analysis?.length || 0} competitors`,
  });

  return {
    ...result,
    raw_search_results: response.searchResults,
    cost,
  };
}

/**
 * Run Phase 2: Feature Decomposition
 * State Changes #12-14
 */
export async function runPhase2(
  appDescription: string,
  phase1Results: any,
  onProgress?: ResearchProgressCallback
): Promise<{
  feature_areas: any[];
  cost: number;
}> {
  onProgress?.({
    phase: 2,
    status: 'in_progress',
    message: 'Breaking down features into atomic components...',
  });

  const messages: Message[] = [
    {
      role: 'user',
      content: `Perform Phase 2 feature decomposition for this app:\n\nApp: ${appDescription}\n\nPhase 1 Results:\n${JSON.stringify(phase1Results, null, 2)}\n\nReturn your findings as JSON matching the specified format.`,
    },
  ];

  const response = await sendMessageWithSearch(
    messages,
    RESEARCH_PHASE_2_PROMPT,
    MODELS.RESEARCH
  );

  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    feature_areas: [],
  };

  const cost = calculateCost(response.usage, MODELS.RESEARCH);

  // Count total components
  const componentCount = result.feature_areas?.reduce((acc: number, area: any) => {
    return acc + (area.sub_features?.reduce((subAcc: number, sub: any) => {
      return subAcc + (sub.components?.length || 0);
    }, 0) || 0);
  }, 0) || 0;

  onProgress?.({
    phase: 2,
    status: 'complete',
    message: `Identified ${componentCount} atomic components across ${result.feature_areas?.length || 0} feature areas`,
  });

  return {
    ...result,
    cost,
  };
}

/**
 * Run Phase 3: Technical Requirements
 * State Changes #15-17
 */
export async function runPhase3(
  appDescription: string,
  phase1Results: any,
  phase2Results: any,
  onProgress?: ResearchProgressCallback
): Promise<{
  component_requirements: any[];
  compliance: any;
  recommended_stack: any;
  estimates: any;
  cost: number;
}> {
  onProgress?.({
    phase: 3,
    status: 'in_progress',
    message: 'Analyzing technical requirements and generating estimates...',
  });

  const messages: Message[] = [
    {
      role: 'user',
      content: `Perform Phase 3 technical requirements analysis for this app:\n\nApp: ${appDescription}\n\nPhase 1 Results:\n${JSON.stringify(phase1Results, null, 2)}\n\nPhase 2 Results:\n${JSON.stringify(phase2Results, null, 2)}\n\nReturn your findings as JSON matching the specified format.`,
    },
  ];

  // Use Opus for technical analysis (needs deep knowledge)
  const response = await sendMessageWithSearch(
    messages,
    RESEARCH_PHASE_3_PROMPT,
    MODELS.TECH_REQUIREMENTS
  );

  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    component_requirements: [],
    compliance: {},
    recommended_stack: {},
    estimates: {},
  };

  const cost = calculateCost(response.usage, MODELS.TECH_REQUIREMENTS);

  onProgress?.({
    phase: 3,
    status: 'complete',
    message: `Generated tech stack recommendation and build estimates`,
  });

  return {
    ...result,
    cost,
  };
}

/**
 * Run Phase 4: Competitive Gap Analysis
 * State Changes #18-19
 */
export async function runPhase4(
  appDescription: string,
  allPriorResults: any,
  onProgress?: ResearchProgressCallback
): Promise<{
  competitive_gaps: string[];
  unique_angle: string;
  mvp_scope: any;
  opportunity: string;
  cost: number;
}> {
  onProgress?.({
    phase: 4,
    status: 'in_progress',
    message: 'Identifying competitive gaps and opportunities...',
  });

  const messages: Message[] = [
    {
      role: 'user',
      content: `Perform Phase 4 competitive gap analysis for this app:\n\nApp: ${appDescription}\n\nAll Research:\n${JSON.stringify(allPriorResults, null, 2)}\n\nReturn your findings as JSON matching the specified format.`,
    },
  ];

  const response = await sendMessageWithSearch(
    messages,
    RESEARCH_PHASE_4_PROMPT,
    MODELS.RESEARCH
  );

  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    competitive_gaps: [],
    unique_angle: '',
    mvp_scope: {},
    opportunity: '',
  };

  const cost = calculateCost(response.usage, MODELS.RESEARCH);

  onProgress?.({
    phase: 4,
    status: 'complete',
    message: 'Research complete!',
  });

  return {
    ...result,
    cost,
  };
}

/**
 * Run full research pipeline
 * State Changes #9-19
 */
export async function runFullResearch(
  appDescription: string,
  onProgress?: ResearchProgressCallback
): Promise<{
  phase_1: any;
  phase_2: any;
  phase_3: any;
  phase_4: any;
  total_cost: number;
}> {
  try {
    // Phase 1: Domain Analysis
    const phase1 = await runPhase1(appDescription, onProgress);

    // Phase 2: Feature Decomposition
    const phase2 = await runPhase2(appDescription, phase1, onProgress);

    // Phase 3: Technical Requirements
    const phase3 = await runPhase3(appDescription, phase1, phase2, onProgress);

    // Phase 4: Competitive Gaps
    const allPrior = { phase_1: phase1, phase_2: phase2, phase_3: phase3 };
    const phase4 = await runPhase4(appDescription, allPrior, onProgress);

    const total_cost = (phase1.cost || 0) + (phase2.cost || 0) + (phase3.cost || 0) + (phase4.cost || 0);

    return {
      phase_1: phase1,
      phase_2: phase2,
      phase_3: phase3,
      phase_4: phase4,
      total_cost,
    };
  } catch (error) {
    console.error('Research pipeline error:', error);
    throw error;
  }
}
