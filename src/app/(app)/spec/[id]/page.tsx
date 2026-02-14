/**
 * Spec Detail Page
 * Shows different views based on spec status:
 * - chatting → Chat interface
 * - researching → Research progress + chat history
 * - generating → Generation progress
 * - review/complete → Spec review interface
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getSpecProjectById } from '@/lib/actions/spec_project';
import { getAllChatMessages } from '@/lib/actions/chat_message';
import { getResearchReportBySpecProject } from '@/lib/actions/research_report';
import { getGeneratedSpecBySpecProject } from '@/lib/actions/generated_spec';
import { SpecWorkflowView } from '@/components/spec/workflow-view';

export default async function SpecDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get spec
  const spec = await getSpecProjectById(params.id);
  if (!spec || spec.user_id !== user.id) {
    redirect('/dashboard');
  }

  // Get chat messages
  const messages = await getAllChatMessages(params.id);

  // Get research report if it exists
  let research = null;
  if (spec.status === 'researching' || spec.status === 'generating' || spec.status === 'review' || spec.status === 'complete') {
    try {
      research = await getResearchReportBySpecProject(params.id);
    } catch (err) {
      // No research yet
    }
  }

  // Get generated spec if it exists
  let generatedSpec = null;
  if (spec.status === 'review' || spec.status === 'complete') {
    try {
      generatedSpec = await getGeneratedSpecBySpecProject(params.id);
    } catch (err) {
      // No generated spec yet
    }
  }

  return (
    <SpecWorkflowView
      spec={spec}
      messages={messages}
      research={research}
      generatedSpec={generatedSpec}
    />
  );
}
