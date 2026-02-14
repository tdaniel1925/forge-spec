# CLAUDE.md — HARD RULES FOR THIS PROJECT

> **You are a deterministic executor, not an architect.**
> The architecture is frozen in PROJECT-SPEC.md. You implement increments only.

---

## MANDATORY PRE-FLIGHT — RUN BEFORE EVERY STAGE

Before writing ANY code, you MUST:

1. Read `PROJECT-SPEC.md` completely
2. Read `DESIGN-SYSTEM.md` completely (for any stage that produces UI)
3. Read `BUILD-STATE.md` (if it exists — it won't exist before Stage 1)
4. Read `BUILD-STAGES.md` and locate ONLY your current stage
5. Output a **SCOPE DECLARATION** in this exact format:

```
## SCOPE DECLARATION — STAGE [N]

### I am building:
[List exactly what this stage produces]

### I am allowed to create/modify these files:
[List from the stage's ALLOWED FILES]

### I am FORBIDDEN from:
[List from the stage's FORBIDDEN section]

### Entities I know about (from PROJECT-SPEC.md):
[List every entity from Gate 1]

### State changes I know about (from PROJECT-SPEC.md):
[List every state change from Gate 2 relevant to this stage]

### Dependencies I must respect (from PROJECT-SPEC.md Gate 4):
[List the adjacency relationships]
```

**If you cannot produce this scope declaration, STOP and ask for clarification.**
**If you produce this and it doesn't match PROJECT-SPEC.md, you have a problem. STOP.**

---

## GLOBAL RULES — APPLY TO EVERY LINE OF CODE YOU WRITE

### Design Rules
- All UI must follow `DESIGN-SYSTEM.md` — colors, typography, components, layout patterns, animations.
- Colors come from CSS variables only. Never hardcode hex/rgb values.
- Use shadcn/ui for forms, dialogs, controls. Use Tremor for dashboards, charts, data. Use Framer Motion for animations.
- Every app must support light + dark mode via next-themes.
- The color palette is AI-generated based on the app description in Gate 0. It must be generated during Stage 3 before any UI is built.
- Never use Inter, Roboto, Arial, or system default fonts. Select distinctive Google Fonts per DESIGN-SYSTEM.md.

### Entity Rules
- Every entity comes from PROJECT-SPEC.md Gate 1. **You may NOT invent entities.**
- Every entity table includes: `id (uuid)`, `created_at`, `updated_at`, `created_by`, `archived_at`
- **Never hard delete business data.** Use `archived_at` for soft delete.
- No orphan entities. No circular ownership. All relationships are directional.

### State Change Rules
- Every behavior is defined as: Actor → Action → State Change (Gate 2)
- **You may NOT invent state changes.** If it's not in Gate 2, it doesn't exist.
- UI is a visualization of state. If it doesn't change state, it's not functionality.

### Permission Rules
- All permissions come from PROJECT-SPEC.md Gate 3. **You may NOT invent roles or permissions.**
- Every mutation checks permissions before executing.

### Dependency Rules
- Higher layers may depend on lower layers.
- **Lower layers may NEVER depend on higher layers.**
- All dependencies come from Gate 4. **You may NOT create undeclared coupling.**

### Layer Rules
- Layer 0: Schema & Types
- Layer 1: Auth & System Spine
- Layer 2: CRUD
- Layer 3: Vertical Slice (first workflow)
- Layer 4: Event System
- Layer 5: Automation
- Layer 6: AI

**You build ONE layer per stage. Never combine layers.**

### Event Rules
- Events are append-only. No updates. No deletes.
- Automation listens to events. AI reads events.
- **Automation does not reason. AI does not mutate schema.**

### File Rules
- **Never modify files outside your current stage's allowed list.**
- **Never modify files from a previous stage** unless the current stage explicitly permits appending to them.
- Check your allowed file list before every file creation or modification.

### Audit Rules
- After completing your stage, run the audit checks defined in BUILD-STAGES.md.
- Output the coherence report in the exact format specified.
- **If any check fails, mark the stage as NOT READY and STOP.**
- After the audit, update `BUILD-STATE.md` with what you built.

---

## FORBIDDEN ACTIONS — NEVER DO THESE

❌ Create entities not in PROJECT-SPEC.md Gate 1
❌ Create state changes not in PROJECT-SPEC.md Gate 2
❌ Create roles or permissions not in PROJECT-SPEC.md Gate 3
❌ Create dependencies not in PROJECT-SPEC.md Gate 4
❌ Modify files from previous stages (unless explicitly allowed)
❌ Skip the pre-flight scope declaration
❌ Skip the post-stage audit
❌ Proceed to the next stage without outputting a coherence report
❌ Refactor previous stage code while building the current stage
❌ Combine multiple stages into one
❌ Add "nice to have" features not in the spec
❌ Use `any` type in TypeScript (use `unknown` if type is unclear)
❌ Hard delete business data
❌ Create circular dependencies between entities

---

## RECOVERY — IF YOU LOSE CONTEXT MID-STAGE

If at any point you are unsure what you should be doing:

1. Re-read this file (CLAUDE.md)
2. Re-read PROJECT-SPEC.md
3. Re-read DESIGN-SYSTEM.md (if building UI)
4. Re-read BUILD-STATE.md
5. Re-output your SCOPE DECLARATION
6. Continue from where you left off

**Never guess. Re-read the files.**

---

## BUILD-STATE.md UPDATE FORMAT

After every stage, create or update `BUILD-STATE.md` with this format:

```markdown
# BUILD STATE — [PROJECT NAME]
## Last completed stage: [N]
## Ready for stage: [N+1]
## Timestamp: [ISO timestamp]

### Stage [N] Summary
- **What was built:** [list]
- **Files created:** [list with paths]
- **Files modified:** [list with paths]
- **Entities implemented:** [list]
- **State changes implemented:** [list]
- **Issues found:** [list or "None"]
- **Coherence status:** PASS / FAIL

### Cumulative State
- **Total files:** [count]
- **Entities with schema:** [list]
- **Entities with CRUD:** [list]
- **Entities with events:** [list]
- **Working workflows:** [list]
- **Active automation rules:** [list]
- **AI features:** [list]
```

---

## End of CLAUDE.md
