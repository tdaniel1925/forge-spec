'use client';

/**
 * Spec Review Component
 * Shows generated spec with tabbed gates view and download option
 */

import { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';

interface SpecReviewProps {
  specId: string;
  specProjectId: string;
  fullSpecMarkdown: string;
  gate0: any;
  gate1: any;
  gate2: any;
  gate3: any;
  gate4: any;
  gate5: any;
  entityCount: number;
  stateChangeCount: number;
  qualityScore: number;
  complexity: string;
  estimatedHours: { min: number; max: number };
  onApprove?: () => void;
}

export function SpecReview({
  specId,
  specProjectId,
  fullSpecMarkdown,
  gate0,
  gate1,
  gate2,
  gate3,
  gate4,
  gate5,
  entityCount,
  stateChangeCount,
  qualityScore,
  complexity,
  estimatedHours,
  onApprove,
}: SpecReviewProps) {
  const [activeTab, setActiveTab] = useState<'gate0' | 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'full'>('gate0');
  const [isDownloading, setIsDownloading] = useState(false);

  const tabs = [
    { id: 'gate0' as const, label: 'Gate 0', content: gate0?.content || '' },
    { id: 'gate1' as const, label: 'Gate 1', content: gate1?.content || '' },
    { id: 'gate2' as const, label: 'Gate 2', content: gate2?.content || '' },
    { id: 'gate3' as const, label: 'Gate 3', content: gate3?.content || '' },
    { id: 'gate4' as const, label: 'Gate 4', content: gate4?.content || '' },
    { id: 'gate5' as const, label: 'Gate 5', content: gate5?.content || '' },
    { id: 'full' as const, label: 'Full Spec', content: fullSpecMarkdown },
  ];

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/download?specId=${specProjectId}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spec-${specProjectId}.forge.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download spec');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Stats */}
      <div className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Your Spec is Ready!
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Review the details below and download your .forge zip
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-gradient-to-r from-[#FF7F50] to-[#FF6347] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              {isDownloading ? 'Downloading...' : 'Download .forge Zip'}
            </button>
            <button
              onClick={() => window.open(process.env.NEXT_PUBLIC_FORGEBOARD_URL || 'https://forgeboard.ai', '_blank')}
              className="bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-6 py-3 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
            >
              Build This For Me
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {qualityScore}/100
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Quality Score
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {entityCount}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Entities
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stateChangeCount}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              State Changes
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 capitalize">
              {complexity}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Complexity
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {estimatedHours.min}-{estimatedHours.max}h
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Est. Build Time
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-neutral-900 text-[#FF7F50] border-b-2 border-[#FF7F50]'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-8 border border-neutral-200 dark:border-neutral-800">
            <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed">
              {tabs.find(t => t.id === activeTab)?.content || 'No content available'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
