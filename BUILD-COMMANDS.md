# Build Commands Cheat Sheet

---

## ForgeBoard v2 (1,860 lines — 5 spec parts)

### Stage 1
```
Read CLAUDE.md, SPEC-PART1.md, SPEC-PART2.md, SPEC-PART3.md, SPEC-PART4.md, SPEC-PART5.md, and .forge/system/BUILD-STAGES.md. Execute Stage 1.
```

### Stages 2-7
```
Read CLAUDE.md, SPEC-PART1.md, SPEC-PART2.md, SPEC-PART3.md, SPEC-PART4.md, SPEC-PART5.md, .forge/system/BUILD-STAGES.md, and .forge/system/BUILD-STATE.md. Execute Stage {N}.
```

---

## ForgeSpec — Free Spec Generator (625 lines — 2 spec parts)

### Stage 1
```
Read CLAUDE.md, SPEC-PART1.md, SPEC-PART2.md, and .forge/system/BUILD-STAGES.md. Execute Stage 1.
```

### Stages 2-7
```
Read CLAUDE.md, SPEC-PART1.md, SPEC-PART2.md, .forge/system/BUILD-STAGES.md, and .forge/system/BUILD-STATE.md. Execute Stage {N}.
```

---

## TaskPool Review — Spencer McGaw CPA Hub (775 lines — 3 spec parts)

**This is a REVIEW, not a build from scratch.**

### Step 1: Clone the repo
```
git clone https://github.com/tdaniel1925/spencer-mcgaw-os.git
cd spencer-mcgaw-os
```

### Step 2: Unzip the review spec into the repo root
Copy from the taskpool-review-spec.zip: CLAUDE.md, .cursorrules, SPEC-PART1.md, SPEC-PART2.md, SPEC-PART3.md, .claude/, .forge/

### Step 3: Run the review (single Claude Code session)
```
Read CLAUDE.md, SPEC-PART1.md, SPEC-PART2.md, SPEC-PART3.md.

This is an EXISTING codebase — do NOT rebuild from scratch.

1. Analyze the entire codebase — map every file, route, component, table, and integration
2. Compare against the PROJECT-SPEC (Gates 0-5)
3. Produce a quality scorecard (0-100) for each category:
   - TypeScript strict mode
   - Zod validation coverage
   - RLS policies
   - Error handling
   - UI states (loading, empty, error)
   - Test coverage
   - Accessibility (WCAG AA)
   - SEO & meta tags
   - Security hardening
   - Mobile responsiveness
   - Performance
4. Produce a gap report: what's in the spec but missing from code
5. Produce a priority fix list: critical → high → medium → low
6. Do NOT modify any code — analysis only. Write results to REVIEW-REPORT.md
```

### Step 4: Fix specific items (separate Claude Code sessions)
```
Read CLAUDE.md, SPEC-PART1.md, SPEC-PART2.md, SPEC-PART3.md, and REVIEW-REPORT.md.

Fix ONLY these items from the review:
- [paste specific items you want fixed]

Do NOT touch anything not listed above.
```

---

## Rules
- NEW Claude Code session for EVERY stage (close and reopen)
- Stage 1: No BUILD-STATE.md (doesn't exist yet)
- Stages 2-7: Always include BUILD-STATE.md
- Review the coherence report after each stage before moving on
- If a stage fails, retry in the SAME session before closing
- For TaskPool review: NEVER rebuild — only analyze and fix specific items
