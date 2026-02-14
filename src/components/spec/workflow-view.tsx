'use client';

/**
 * Spec Workflow View
 * Orchestrates the entire spec generation workflow
 * Shows appropriate UI based on current status
 */

import { useState, useEffect } from 'react';
import { ChatInterface } from './chat-interface';
import { ResearchProgress } from './research-progress';
import { SpecReview } from './spec-review';
import { Loader2 } from 'lucide-react';

interface SpecWorkflowViewProps {
  spec: any;
  messages: any[];
  research: any;
  generatedSpec: any;
}

export function SpecWorkflowView({
  spec,
  messages: initialMessages,
  research: initialResearch,
  generatedSpec: initialGeneratedSpec,
}: SpecWorkflowViewProps) {
  const [status, setStatus] = useState(spec.status);
  const [research, setResearch] = useState(initialResearch);
  const [generatedSpec, setGeneratedSpec] = useState(initialGeneratedSpec);
  const [researchPhases, setResearchPhases] = useState([
    {
      number: 1 as const,
      name: 'Domain Analysis',
      description: 'Finding competitors and analyzing the market',
      status: 'pending' as const,
    },
    {
      number: 2 as const,
      name: 'Feature Decomposition',
      description: 'Breaking down features into atomic components',
      status: 'pending' as const,
    },
    {
      number: 3 as const,
      name: 'Technical Requirements',
      description: 'Identifying libraries, APIs, and compliance needs',
      status: 'pending' as const,
    },
    {
      number: 4 as const,
      name: 'Competitive Gaps',
      description: 'Finding opportunities and defining MVP scope',
      status: 'pending' as const,
    },
  ]);
  const [researchProgress, setResearchProgress] = useState(0);

  // Start research when triggered from chat
  const handleResearchStart = async () => {
    setStatus('researching');

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specId: spec.id }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setStatus('generating');
              handleSpecGeneration();
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.phase && parsed.status) {
                const phaseIdx = parsed.phase - 1;
                setResearchPhases(prev => {
                  const updated = [...prev];
                  updated[phaseIdx] = {
                    ...updated[phaseIdx],
                    status: parsed.status,
                    message: parsed.message,
                  };
                  return updated;
                });
                setResearchProgress(parsed.phase * 25);
              }
            } catch (err) {
              // Not JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Research error:', error);
    }
  };

  // Start spec generation
  const handleSpecGeneration = async () => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specId: spec.id }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const result = await response.json();
      setStatus('review');

      // Refresh page to show spec review
      window.location.reload();
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  // Render based on status
  if (status === 'chatting') {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <ChatInterface
          specId={spec.id}
          initialMessages={initialMessages}
          onResearchStart={handleResearchStart}
        />
      </div>
    );
  }

  if (status === 'researching') {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <ResearchProgress
          phases={researchPhases}
          overallProgress={researchProgress}
        />
        <div className="mt-8 text-center text-neutral-600 dark:text-neutral-400">
          <p>This may take 2-3 minutes. We're doing deep research to ensure nothing is missed.</p>
        </div>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#FF7F50] animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Generating Your Spec
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            Creating a complete PROJECT-SPEC.md with all gates...
          </p>
        </div>
      </div>
    );
  }

  if ((status === 'review' || status === 'complete') && generatedSpec) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <SpecReview
          specId={generatedSpec.id}
          specProjectId={spec.id}
          fullSpecMarkdown={generatedSpec.full_spec_markdown}
          gate0={generatedSpec.gate_0}
          gate1={generatedSpec.gate_1}
          gate2={generatedSpec.gate_2}
          gate3={generatedSpec.gate_3}
          gate4={generatedSpec.gate_4}
          gate5={generatedSpec.gate_5}
          entityCount={generatedSpec.entity_count}
          stateChangeCount={generatedSpec.state_change_count}
          qualityScore={generatedSpec.spec_quality_score}
          complexity={generatedSpec.complexity_rating}
          estimatedHours={{
            min: generatedSpec.estimated_build_hours_min,
            max: generatedSpec.estimated_build_hours_max,
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center">
        <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
      </div>
    </div>
  );
}
