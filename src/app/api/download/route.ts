/**
 * Download API Route - Generates and serves .forge zip
 * State Change #26
 *
 * This route:
 * 1. Verifies spec is complete
 * 2. Generates .forge zip with all system files
 * 3. Creates spec_download record
 * 4. Increments download count
 * 5. Sets user.has_downloaded flag
 * 6. Serves the zip file
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSpecProjectById, incrementDownloadCount } from '@/lib/actions/spec_project';
import { getGeneratedSpecBySpecProject } from '@/lib/actions/generated_spec';
import { createSpecDownload } from '@/lib/actions/spec_download';
import { generateForgeZip, getZipSize } from '@/lib/forge/zip-generator';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const specId = searchParams.get('specId');

    if (!specId) {
      return NextResponse.json({ error: 'Missing specId' }, { status: 400 });
    }

    // Verify spec ownership
    const spec = await getSpecProjectById(specId);
    if (!spec || spec.user_id !== user.id) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    // Verify spec is complete
    if (spec.status !== 'complete') {
      return NextResponse.json(
        { error: 'Spec is not complete yet' },
        { status: 400 }
      );
    }

    // Get generated spec
    const genSpec = await getGeneratedSpecBySpecProject(specId);
    if (!genSpec || genSpec.spec_status !== 'complete') {
      return NextResponse.json(
        { error: 'Generated spec not found' },
        { status: 404 }
      );
    }

    // Generate .forge zip (State Change #26)
    const zipBuffer = await generateForgeZip({
      projectName: spec.slug || spec.name.toLowerCase().replace(/\s+/g, '-'),
      fullSpecMarkdown: genSpec.full_spec_markdown,
      includedPatterns: [], // Include all patterns
    });

    const zipSize = getZipSize(zipBuffer);

    // Create download record
    await createSpecDownload({
      spec_project_id: specId,
      user_id: user.id,
      zip_size_bytes: zipSize,
      included_patterns: [],
    });

    // Increment download count (triggers side effects)
    await incrementDownloadCount(specId);

    // Serve the zip file
    const fileName = `${spec.slug || 'spec'}.forge.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipSize.toString(),
      },
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    );
  }
}
