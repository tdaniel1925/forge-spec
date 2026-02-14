'use client';

/**
 * Research Progress Component
 * Shows the 4-phase research progress with status indicators
 */

import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface ResearchPhase {
  number: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  message?: string;
}

interface ResearchProgressProps {
  phases: ResearchPhase[];
  overallProgress: number; // 0-100
}

export function ResearchProgress({ phases, overallProgress }: ResearchProgressProps) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7F50] to-[#FF6347] text-white">
          <span className="text-lg">🔍</span>
        </div>
        <div>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
            Deep Research in Progress
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {overallProgress}% complete
          </p>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {phases.map((phase) => (
          <div
            key={phase.number}
            className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
              phase.status === 'in_progress'
                ? 'bg-blue-50 dark:bg-blue-950/20'
                : ''
            }`}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {phase.status === 'complete' && (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              )}
              {phase.status === 'in_progress' && (
                <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
              )}
              {phase.status === 'pending' && (
                <Circle className="w-6 h-6 text-neutral-300 dark:text-neutral-700" />
              )}
              {phase.status === 'failed' && (
                <Circle className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Phase {phase.number}:
                </span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {phase.name}
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                {phase.message || phase.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF7F50] to-[#FF6347] transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
