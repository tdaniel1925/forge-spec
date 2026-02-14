/**
 * Forge Zip Generator - Creates downloadable .forge zip
 * State Change #26
 *
 * The zip contains:
 * - PROJECT-SPEC.md (generated spec)
 * - CLAUDE.md (from .forge/system/)
 * - .cursorrules (from .forge/system/)
 * - BUILD-STAGES.md (from .forge/system/)
 * - BUILD-STATE.md (from .forge/system/)
 * - .claude/settings.json
 * - .forge/system/ (all system files)
 * - .forge/patterns/ (all 28 pattern files - if they exist)
 * - .forge/design/ (all 5 design files - if they exist)
 */

import JSZip from 'jszip';
import { promises as fs } from 'fs';
import path from 'path';

interface ForgeZipOptions {
  projectName: string;
  fullSpecMarkdown: string;
  includedPatterns?: string[];
}

/**
 * Generate .forge zip file
 */
export async function generateForgeZip(
  options: ForgeZipOptions
): Promise<Buffer> {
  const zip = new JSZip();
  const { projectName, fullSpecMarkdown, includedPatterns } = options;

  const projectFolder = zip.folder(projectName)!;

  // Add PROJECT-SPEC.md (the generated spec)
  projectFolder.file('PROJECT-SPEC.md', fullSpecMarkdown);

  // Read system files from .forge/system/
  const systemPath = path.join(process.cwd(), '.forge', 'system');

  try {
    // Add CLAUDE.md
    const claudeMd = await fs.readFile(
      path.join(systemPath, 'CLAUDE.md'),
      'utf-8'
    );
    projectFolder.file('CLAUDE.md', claudeMd);

    // Add .cursorrules (from .forge/system/cursorrules - no dot)
    const cursorRules = await fs.readFile(
      path.join(systemPath, 'cursorrules'),
      'utf-8'
    );
    projectFolder.file('.cursorrules', cursorRules);

    // Add BUILD-STAGES.md
    const buildStages = await fs.readFile(
      path.join(systemPath, 'BUILD-STAGES.md'),
      'utf-8'
    );

    // Add BUILD-STATE.md (initial template)
    const buildState = `# BUILD STATE — ${projectName}
## Last Completed Stage: 0 (not started)
## Ready For Stage: 1
## Timestamp: ${new Date().toISOString()}

---

# Stage History

> Each stage entry is added after completion. This is the cumulative record.

[No stages completed yet. Stage 1 will populate this section.]

---

# Cumulative State

## Schema
- Tables created: [none yet]
- Enums created: [none yet]
- RLS policies: [none yet]

## Auth
- Roles implemented: [none yet]
- Protected routes: [none yet]

## CRUD
- Entities with full CRUD: [none yet]

## Workflows
- Working workflows: [none yet]

## Events
- Event types: [none yet]
- State changes with events: [none yet]

## Automation
- Active rules: [none yet]

## AI
- AI features: [none yet]

---

# Files Created

> Updated after each stage with every file path.

[No files created yet.]

---

# Known Issues

> Any unresolved issues from coherence reports.

[None.]
`;

    // Add .forge folder
    const forgeFolder = projectFolder.folder('.forge')!;

    // Add .forge/PROJECT-SPEC.md (copy)
    forgeFolder.file('PROJECT-SPEC.md', fullSpecMarkdown);

    // Add .forge/system/
    const systemFolder = forgeFolder.folder('system')!;
    systemFolder.file('CLAUDE.md', claudeMd);
    systemFolder.file('BUILD-STAGES.md', buildStages);
    systemFolder.file('BUILD-STATE.md', buildState);
    systemFolder.file('cursorrules', cursorRules);

    // Add .forge/patterns/ (if they exist)
    try {
      const patternsPath = path.join(process.cwd(), '.forge', 'patterns');
      const patternFiles = await fs.readdir(patternsPath);

      if (patternFiles.length > 0) {
        const patternsFolder = forgeFolder.folder('patterns')!;

        for (const file of patternFiles) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(
              path.join(patternsPath, file),
              'utf-8'
            );
            patternsFolder.file(file, content);
          }
        }
      }
    } catch (err) {
      // Patterns folder doesn't exist, skip
      console.log('No patterns folder found, skipping');
    }

    // Add .forge/design/ (if they exist)
    try {
      const designPath = path.join(process.cwd(), '.forge', 'design');
      const designFiles = await fs.readdir(designPath);

      if (designFiles.length > 0) {
        const designFolder = forgeFolder.folder('design')!;

        for (const file of designFiles) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(
              path.join(designPath, file),
              'utf-8'
            );
            designFolder.file(file, content);
          }
        }
      }
    } catch (err) {
      // Design folder doesn't exist, skip
      console.log('No design folder found, skipping');
    }

    // Add .claude/settings.json
    const claudeFolder = projectFolder.folder('.claude')!;
    claudeFolder.file(
      'settings.json',
      JSON.stringify(
        {
          mcpServers: {},
        },
        null,
        2
      )
    );

    // Generate zip
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    });

    return zipBuffer;
  } catch (error) {
    console.error('Error generating forge zip:', error);
    throw new Error('Failed to generate .forge zip');
  }
}

/**
 * Calculate zip size in bytes
 */
export function getZipSize(zipBuffer: Buffer): number {
  return zipBuffer.length;
}
