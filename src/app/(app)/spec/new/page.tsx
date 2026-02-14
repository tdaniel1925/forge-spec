/**
 * New Spec Page
 * State Change #6: user → "New Spec" → spec_project created (status=chatting)
 *
 * This page creates a new spec and redirects to the detail page
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createSpecProject } from '@/lib/actions/spec_project';
import { createSystemMessage } from '@/lib/actions/chat_message';

export default async function NewSpecPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Create new spec project (State Change #6)
  const spec = await createSpecProject({
    user_id: user.id,
    name: `New Spec ${new Date().toLocaleDateString()}`,
    description: '',
    slug: `spec-${Date.now()}`,
    status: 'chatting',
  });

  // Create first system message
  await createSystemMessage(
    spec.id,
    'What would you like to build?',
    { phase: 'initial' }
  );

  // Redirect to spec detail page
  redirect(`/spec/${spec.id}`);
}
