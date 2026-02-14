# PROJECT-SPEC.md — FORGESPEC
# Free AI Spec Generator by BotMakers
# Built with PRD-Forge Build System

---

# GATE 0 — IDENTITY

## System Name
ForgeSpec

## Tagline
"Turn any idea into a production-ready spec in minutes."

## What It Is
A free web application that lets anyone describe an app idea and receive a professionally researched, granularly detailed PROJECT-SPEC.md — the same document used by the PRD-Forge build system to generate production apps in Claude Code. ForgeSpec performs deep domain research, decomposes every feature into atomic components, identifies technical requirements, and produces a downloadable .forge zip ready for Claude Code.

ForgeSpec is the top-of-funnel lead generator for BotMakers and ForgeBoard. Every user creates an account (email collected), every spec generated is saved, and every spec includes a "Want this built for you?" CTA that links to ForgeBoard's paid tiers.

### What Makes ForgeSpec Valuable
1. **Deep Research** — Not just "what do you want?" but "here's what the best products in this space do, here's every component you need, and here's the technical requirements for each one"
2. **Granular Decomposition** — A client says "email client" and ForgeSpec returns 200+ atomic components across compose, inbox, threading, search, contacts, settings, and integrations
3. **Production-Ready Output** — The generated .forge zip works immediately in Claude Code. No reformatting, no guessing.
4. **Saved Specs** — Users can come back, iterate, version, and refine specs over time
5. **Free Forever** — The spec generator is always free. The upsell is "let us build it for you."

### How It Works (User Flow)
```
1. User signs up (email + password, or Google OAuth)
2. User clicks "New Spec"
3. AI chat asks about the app (guided conversation)
4. Behind the scenes: AI researches the domain (web search)
5. AI presents research findings to user: "Here's what I found about this space..."
6. AI asks follow-up questions based on research
7. User approves direction
8. AI generates full PROJECT-SPEC.md with Gates 0-5
9. User can review, edit, request changes
10. User downloads .forge zip (spec + system files + patterns)
11. Dashboard shows all saved specs with status
```

### Revenue Strategy
- ForgeSpec itself: FREE (lead generation)
- Email list: Every signup is a warm lead who wants to build software
- Upsell #1: "Build This For Me" → ForgeBoard ($199-499/mo)
- Upsell #2: "Have BotMakers Build It" → Done-for-you service ($5K-15K)
- Every spec page shows: "This spec would take ~30 minutes to build with ForgeBoard. Want us to handle it?"

## Who It Is For

| Role | Description |
|------|------------|
| user | Anyone who wants to generate a spec. Signs up with email. Can create unlimited specs, save them, download .forge zips. Free forever. |
| admin | Daniel / BotMakers team. Can view all users, all specs, analytics (most common app types, signup rates, download rates, conversion to ForgeBoard). Manages the platform. |

## What It Is NOT
- This does NOT build apps — it generates the spec document only
- This does NOT deploy anything — it produces a downloadable zip
- This does NOT require payment — entirely free
- This is NOT a code editor — users interact through chat and spec review only
- Out of scope: team collaboration, real-time co-editing, version control branching

---

# GATE 1 — ENTITY MODEL (NOUNS)

| Entity | Owner | Parent | States | Source of Truth | Key Fields |
|--------|-------|--------|--------|-----------------|------------|
| user | self | none | active, inactive | users | email, name, password_hash (nullable — null if OAuth), avatar_url, auth_provider (email/google), signup_source (text — utm tracking), created_at, last_login_at, specs_generated (int, computed), has_downloaded (boolean) |
| spec_project | user | none | researching, chatting, generating, review, complete, archived | spec_projects | name, description (user's initial input), slug, research_status (pending/in_progress/complete/skipped), spec_status (draft/complete), download_count (int), version (int), parent_spec_id (nullable — for iterations), created_at, updated_at |
| chat_message | user | spec_project | none (append-only) | chat_messages | role (user/assistant/system), content (text), message_order (int), metadata (jsonb — research citations, phase markers), created_at |
| research_report | system | spec_project | generating, phase_1, phase_2, phase_3, phase_4, complete, failed | research_reports | domain_summary (text), competitor_analysis (jsonb — array of {name, url, features, strengths, weaknesses}), feature_decomposition (jsonb — nested tree of features → sub-features → atomic components), technical_requirements (jsonb — per-component: required APIs, libraries, data models, edge cases), competitive_gaps (jsonb — opportunities, MVP scope), raw_search_results (jsonb), generated_at, total_cost_usd (decimal) |
| generated_spec | system | spec_project | generating, validating, complete, failed | generated_specs | gate_0 (jsonb), gate_1 (jsonb), gate_2 (jsonb), gate_3 (jsonb), gate_4 (jsonb), gate_5 (jsonb — integrations), full_spec_markdown (text — the actual PROJECT-SPEC.md content), recommended_stack (jsonb), stack_rationale (text), entity_count (int), state_change_count (int), validation_errors (jsonb, nullable), spec_quality_score (int — 0-100, computed by rule-based validator), er_diagram_mermaid (text — Mermaid ER diagram source), complexity_rating (simple/moderate/complex/enterprise), estimated_build_hours_min (int), estimated_build_hours_max (int), estimated_api_cost (decimal), estimated_monthly_hosting (decimal), compliance_requirements (text[], nullable — e.g. ["HIPAA", "PCI-DSS"]), generated_at, generation_cost_usd (decimal) |
| spec_download | system | spec_project | created | spec_downloads | spec_project_id, user_id, downloaded_at, zip_size_bytes, included_patterns (text[] — which pattern files were included) |
| waitlist_entry | system | none | pending, invited, converted | waitlist_entries | email, name, spec_project_id (nullable — which spec triggered interest), source (text — "build_cta", "pricing_page", "email_campaign"), created_at, invited_at, converted_at |
| admin_analytics | system | none | none (append-only) | admin_analytics | snapshot_date (date), total_users (int), new_signups_today (int), specs_generated_today (int), specs_downloaded_today (int), most_common_app_types (jsonb), avg_spec_generation_time_seconds (int), total_api_cost_usd (decimal), waitlist_signups_today (int), conversion_rate (decimal) |
| feedback | user | spec_project | pending, reviewed | feedbacks | user_id, spec_project_id (nullable), rating (int 1-5), comment (text), feedback_type (spec_quality/ui/feature_request/bug/other), created_at |

## Entity Relationship Rules

- A user has many spec_projects
- A spec_project has many chat_messages (the research + spec conversation)
- A spec_project has zero or one research_report (created during research phase)
- A spec_project has zero or one generated_spec (created after conversation completes)
- A spec_project has many spec_downloads (tracked per download event)
- A spec_project can link to a parent_spec (for versioned iterations)
- A waitlist_entry can optionally link to a spec_project (which spec prompted the "build for me" interest)
- admin_analytics is a daily rollup, one per day
- feedback optionally links to a spec_project
- user.specs_generated is a computed count of spec_projects with status = complete
- user.has_downloaded is true once any spec_download exists

---

# GATE 2 — STATE CHANGES (SYSTEM PHYSICS)

## Auth State Changes

| # | Actor | Action | State Change | Preconditions |
|---|-------|--------|-------------|---------------|
| 1 | visitor | signs up with email | user created (active), verification email sent, logged in | valid email + password (min 8 chars) |
| 2 | visitor | signs up with Google OAuth | user created (active), avatar_url + name populated from Google, logged in | valid Google token |
| 3 | user | logs in | session created, last_login_at updated | valid credentials |
| 4 | user | logs out | session destroyed | logged in |
| 5 | user | resets password | reset email sent, password updated on confirmation | valid email exists |

## Spec Creation State Changes

| # | Actor | Action | State Change | Preconditions |
|---|-------|--------|-------------|---------------|
| 6 | user | clicks "New Spec" | spec_project created (status=chatting), first system message sent: "What would you like to build?" | user logged in |
| 7 | user | describes their app idea | chat_message created (role=user), AI analyzes description | spec_project.status = chatting |
| 8 | system | determines enough initial context | spec_project.status = researching, research_report created (status=generating) | AI has app type + target audience + core purpose |

## Research State Changes

| # | Actor | Action | State Change | Preconditions |
|---|-------|--------|-------------|---------------|
| 9 | system | Phase 1: Domain Analysis | research_report.status = phase_1. Claude + web_search performs deep domain research: (a) Finds top 5-10 competitors — name, URL, key features, pricing, strengths, weaknesses. (b) Searches for user reviews/complaints about each competitor (G2, Product Hunt, Reddit, app store reviews) — identifies top pain points, most-requested missing features, common frustrations. (c) Identifies the target user personas — who uses these products, what roles, what company sizes. (d) Detects industry/domain — if healthcare, finance, education, legal, etc. → flags compliance requirements (HIPAA, PCI-DSS, FERPA, SOC2, GDPR). (e) Writes domain_summary covering market context, user types, regulatory landscape. Stores all in competitor_analysis + domain_summary. | research_report.status = generating |
| 10 | system | Phase 1 complete → present to user | Chat message: "Here's what I found about [domain]..." Summarizes top competitors, their features, and key patterns. Asks: "Based on this research, what should we focus on? Anything you want to do differently?" | phase_1 data populated |
| 11 | user | responds to research | chat_message created. AI incorporates user direction. | presented research |
| 12 | system | Phase 2: Feature Decomposition | research_report.status = phase_2. Claude breaks EVERY feature into atomic components, cross-referencing against actual competitor feature sets from Phase 1. For each feature area, checks: "Does Competitor A have this? Does Competitor B?" Ensures no common feature is missed. Example for "email compose": rich_text_editor, image_paste_clipboard, image_paste_drag_drop, attachment_upload, attachment_preview, inline_image_resize, cc_field, bcc_field, reply_to_field, contact_autocomplete, signature_insert, signature_editor, draft_auto_save, draft_manual_save, send_button, send_scheduling, send_later_picker, template_insertion, template_management, emoji_picker, mention_support, link_preview, spell_check, undo_redo. Also adds edge cases from user complaints found in Phase 1 (e.g., "users on G2 complained about no offline support" → add offline_draft_queue). Stored as nested tree in feature_decomposition with competitor coverage tags. | phase_1 complete + user direction received |
| 13 | system | Phase 2 complete → present to user | Chat message: "I've broken down every feature into its components. Here's the full breakdown..." Shows the feature tree. Asks: "Should I include all of these? Anything to add or remove?" | phase_2 data populated |
| 14 | user | confirms or adjusts features | chat_message created. AI updates feature_decomposition based on user feedback. | presented features |
| 15 | system | Phase 3: Technical Requirements | research_report.status = phase_3. For each atomic component, Claude identifies: required APIs/libraries (e.g., TipTap for rich text, DnD Kit for drag-drop), data models (tables/fields needed), edge cases (max file size, paste from Word formatting, etc.), estimated complexity (simple/medium/complex). ALSO generates: (a) Compliance requirements — if industry detected in Phase 1 (healthcare → HIPAA: encryption at rest, audit logging, BAA, access controls; finance → PCI-DSS: tokenized payments, no card storage; etc.). (b) Build estimate — estimated hours per feature area, total estimated build time, estimated API cost for ForgeBoard build. (c) Scale considerations — expected data volume, concurrent users, storage needs. (d) Infrastructure costs — estimated monthly hosting cost at launch and at 1K/10K/100K users. Stored in technical_requirements. | phase_2 confirmed |
| 16 | system | Phase 3 complete → present to user | Chat message: "Here are the technical requirements..." Shows key decisions: recommended stack, critical libraries, data model overview. Asks about integrations: "Does this app need to connect to any external services?" | phase_3 data populated |
| 17 | user | provides integration details | chat_message created. AI captures integration requirements. | presented technical requirements |
| 18 | system | Phase 4: Competitive Gaps | research_report.status = phase_4 → complete. Claude identifies: what competitors miss, what user's unique angle is, what the MVP scope should be (vs full product), where the biggest opportunity lies. Stored in competitive_gaps. | phase_3 complete |
| 19 | system | Research complete | research_report.status = complete, spec_project.status = generating | all 4 phases done |

## Spec Generation State Changes

| # | Actor | Action | State Change | Preconditions |
|---|-------|--------|-------------|---------------|
| 20 | system | generates spec | generated_spec created (status=generating). Claude uses ALL research data (domain_summary, competitor_analysis, feature_decomposition, technical_requirements, competitive_gaps) + full chat history to write a complete PROJECT-SPEC.md with Gates 0-5. Every atomic component from Phase 2 becomes an entity field, state change, or UI element. Every integration from Phase 3 becomes a Gate 5 entry. Stack recommended based on requirements. Gate 5 must include for each integration: auth method, endpoints, webhooks (inbound + outbound), error handling strategy, rate limits, env var names, data mapping to entities. Gate 3 must include explicit RLS policies per entity. Gate 2 must include failure/rollback scenarios for complex state changes. If compliance requirements detected in Phase 1, they are woven into every gate (encrypted fields in Gate 1, audit logging in Gate 2, compliance permissions in Gate 3, compliance integrations in Gate 5). | research complete |
| 20b | system | validates spec completeness | After generation, system runs rule-based validation: (a) Every entity in Gate 1 has CREATE + READ + UPDATE/ARCHIVE in Gate 2. (b) Every entity has permissions in Gate 3. (c) Every FK in Gate 1 appears in Gate 4 adjacency list. (d) Every external service in Gate 2 has a Gate 5 entry with auth + endpoints + error handling. (e) Every entity state is reachable and has a terminal state. (f) No orphan entities. Produces a spec_quality_score (0-100) and validation_errors list. If score < 60, auto-fix and regenerate failed gates. | spec generated |
| 20c | system | generates ER diagram | From Gate 1 entities + Gate 4 adjacency list, generates a Mermaid entity-relationship diagram showing all entities, their key fields, and relationships. Stored in generated_spec.er_diagram_mermaid. Rendered in the spec review UI. | spec generated |
| 20d | system | generates build estimate | From Phase 3 technical requirements + entity count + state change count, generates: estimated_build_hours (range), estimated_api_cost (for ForgeBoard build), estimated_monthly_hosting_cost, complexity_rating (simple/moderate/complex/enterprise). Stored in generated_spec metadata. Shown on spec review page. | spec generated |
| 21 | system | spec complete | generated_spec.status = complete, spec_project.status = review. Chat message: "Your spec is ready! Review it below and let me know if you want any changes." | generation successful |
| 22 | system | spec generation fails | generated_spec.status = failed, retry with error context | API error or timeout |
| 23 | user | reviews spec | spec displayed in formatted view with all gates | spec_project.status = review |
| 24 | user | requests changes | chat_message created (role=user), spec_project.status = chatting, AI regenerates affected gates | reviewing |
| 25 | user | approves spec | spec_project.status = complete | no unresolved change requests |

## Download State Changes

| # | Actor | Action | State Change | Preconditions |
|---|-------|--------|-------------|---------------|
| 26 | user | clicks "Download .forge zip" | spec_download created. System packages: generated_spec.full_spec_markdown as PROJECT-SPEC.md + .forge/system/ files (CLAUDE.md, BUILD-STAGES.md, BUILD-STATE.md, .cursorrules) + .forge/patterns/ (all pattern files) + .forge/design/ + .claude/settings.json. Zip generated and served. | spec_project.status = complete |
| 27 | user | clicks "Build This For Me" | waitlist_entry created (source=build_cta), redirect to ForgeBoard pricing page or waitlist confirmation | spec_project.status = complete |

## Iteration State Changes

| # | Actor | Action | State Change | Preconditions |
|---|-------|--------|-------------|---------------|
| 28 | user | creates new version of spec | new spec_project created with parent_spec_id linking to original, version incremented, generated_spec cloned as starting point, status = review (user can edit immediately) | original spec_project.status = complete |
| 29 | user | archives spec | spec_project.status = archived, hidden from dashboard but not deleted | user owns the spec |

## Admin State Changes

| # | Actor | Action | State Change | Preconditions |
|---|-------|--------|-------------|---------------|
| 30 | system | daily analytics | admin_analytics row created: total users, signups, specs generated, downloads, most common app types, API costs, waitlist signups, conversion rates | cron daily |
| 31 | admin | views analytics | read-only dashboard with charts | admin role |
| 32 | admin | exports email list | CSV download of all users: email, name, signup date, specs generated, has downloaded, waitlist status | admin role |

## Edge Cases

| # | Edge Case | System Behavior |
|---|-----------|----------------|
| E1 | User describes something too vague ("make me an app") | AI asks clarifying questions: "What problem does this solve? Who uses it? What's the core workflow?" Won't start research until it has enough context. |
| E2 | Research finds no competitors | AI notes this is a novel space, proceeds with technical analysis only, flags to user: "This appears to be a new category. I'll focus on technical requirements." |
| E3 | User wants a very simple app (1-2 entities) | Research phase is abbreviated (skip competitive analysis), spec generated faster. AI suggests: "This is a simple app — you might not need the full research phase." |
| E4 | Research times out | research_report.status = failed for that phase, skip to next phase or proceed without. User notified: "Research partially complete, proceeding with what I found." |
| E5 | Spec generation produces invalid gates | validation_errors populated, AI auto-fixes (retry with error context), user sees clean result |
| E6 | User tries to download before spec is complete | Download button disabled, tooltip: "Complete your spec review first" |
| E7 | User has 50+ specs (heavy user) | Pagination on dashboard, no hard limit, archive encouraged |
| E8 | Concurrent spec generation (user opens multiple) | Each spec is independent, no conflict |
| E9 | OAuth account already exists as email account | Merge accounts, link OAuth provider to existing email user |
| E10 | User pastes entire PRD or requirements doc | AI parses it, extracts key information, uses it to jumpstart research |

---

# GATE 3 — PERMISSIONS & DATA RULES

## Role Permissions

| Role | Can Create | Can Read | Can Update | Can Archive | Special Rules |
|------|-----------|---------|-----------|------------|---------------|
| user | spec_project, chat_message, feedback, waitlist_entry | own spec_projects + chat_messages + generated_specs + research_reports + spec_downloads | own spec_project (name, while not archived), feedback | own spec_project | Cannot see other users' specs. Cannot access admin analytics. |
| admin | everything user can + admin_analytics (auto) | all entities across all users | all entities | all entities | Full read access. Can export user data. Views analytics dashboard. |
| system | research_report, generated_spec, spec_download, admin_analytics | all entities | all entities | none | Automated via research + generation pipeline |

## Data Mutability Rules

| Entity | Mutability | Explanation |
|--------|-----------|-------------|
| user | mutable | Profile updates, login tracking |
| spec_project | mutable | Status changes throughout lifecycle |
| chat_message | append-only | Conversation history is immutable |
| research_report | write-once per phase | Each phase writes once, never overwritten |
| generated_spec | mutable during review | Can be regenerated if user requests changes, locked once downloaded |
| spec_download | append-only | Tracking events, never modified |
| waitlist_entry | mutable | Status changes (pending → invited → converted) |
| admin_analytics | append-only | Daily snapshots, never modified |
| feedback | mutable | Admin can mark as reviewed |

## Row-Level Security

- Users see ONLY their own data (spec_projects, chat_messages, etc.)
- Admin bypasses RLS (service_role key)
- No user can see another user's specs, research, or conversations
- waitlist_entries are write-once by user, readable by admin only
- admin_analytics readable by admin only

---

# GATE 4 — DEPENDENCY MAP

## Adjacency List

```
user → spec_project (has_many)
user → feedback (has_many)
spec_project → chat_message (has_many)
spec_project → research_report (has_one, nullable)
spec_project → generated_spec (has_one, nullable)
spec_project → spec_download (has_many)
spec_project → parent_spec (belongs_to, nullable — version chain)
spec_project → waitlist_entry (has_many — multiple CTAs possible)
waitlist_entry → spec_project (belongs_to, nullable)
feedback → spec_project (belongs_to, nullable)
admin_analytics → none (standalone daily rollup)
```

## Data Flow

**Signup Flow:** Visitor lands on marketing page → signs up (email or Google) → redirected to dashboard → email collected + welcome email sent.

**Spec Generation Flow:** User creates spec → describes app → AI researches domain (4 phases, each presented to user for feedback) → AI generates PROJECT-SPEC.md with Gates 0-5 → user reviews → user downloads .forge zip.

**Research Flow (detailed):**
```
Phase 1: Domain Analysis
├── Claude + web_search → find top 5-10 competitors
├── For each: name, URL, features, pricing, strengths, weaknesses
├── Write domain_summary (market context, user types)
└── Present to user → get direction

Phase 2: Feature Decomposition
├── For each feature area (from competitors + user input)
├── Break into sub-features → atomic components
├── Example: "Inbox" → thread_grouping, read_unread_state, star_flag,
│   bulk_select, bulk_archive, bulk_delete, search_bar, search_filters,
│   search_date_range, pagination, infinite_scroll, pull_to_refresh,
│   new_email_indicator, realtime_push, swipe_actions_archive,
│   swipe_actions_delete, keyboard_shortcuts, email_preview_pane,
│   split_view, full_width_view, label_assignment, label_creation,
│   label_colors, snooze, snooze_picker, undo_actions, empty_state
├── Store as nested tree
└── Present to user → confirm/adjust

Phase 3: Technical Requirements
├── For each atomic component:
│   ├── Required library (e.g., TipTap, DnD Kit, date-fns)
│   ├── API needed (e.g., IMAP, SMTP, Microsoft Graph)
│   ├── Data model fields
│   ├── Edge cases (max file size, encoding, mobile behavior)
│   └── Complexity estimate (simple/medium/complex)
├── Aggregate into stack recommendation
└── Present to user → ask about integrations

Phase 4: Competitive Gaps
├── What competitors miss
├── User's unique angle
├── MVP scope vs full product
└── Biggest opportunity
```

**Download Flow:** Spec complete → system packages .forge zip → includes PROJECT-SPEC.md + system files + 28 pattern files + 5 design files + .claude/settings.json → user downloads → ready for Claude Code.

**Upsell Flow:** User sees "Build This For Me" CTA on completed spec page → clicks → waitlist_entry created → redirected to ForgeBoard pricing/waitlist page → email captured for follow-up.

## Automation Rules

| # | Trigger Event | Automation Action | Idempotent | Failure Behavior |
|---|--------------|-------------------|-----------|-----------------|
| 1 | user.created | Send welcome email via Resend: "Welcome to ForgeSpec! Create your first spec →" | yes | Log failure, user can still use app |
| 2 | spec_project.status = researching | Start 4-phase research pipeline (sequential, each phase waits for user feedback) | yes | Skip failed phase, proceed |
| 3 | research_report.status = complete | Trigger spec generation | yes | Retry once |
| 4 | generated_spec.status = complete | Validate spec (cross-reference gates), populate validation_errors or clear them | yes | Surface errors to user |
| 5 | spec_download.created | Increment spec_project.download_count, set user.has_downloaded = true | yes | Safe |
| 6 | waitlist_entry.created | Send email to admin: "New ForgeBoard interest: {email} wants {spec_name} built" | yes | Non-blocking |
| 7 | cron: daily 3am | Create admin_analytics snapshot, compute conversion rates | yes | Log warning |
| 8 | user.created (7 days later) | If user hasn't created a spec: send nudge email "Ready to build your first spec?" | yes | Non-blocking |
| 9 | spec_project.status = complete + not downloaded (3 days) | Send reminder email: "Your spec for {name} is ready to download!" | yes | Non-blocking |
| 10 | spec_project.status = complete + downloaded (7 days) | Send upsell email: "How's the build going? Let ForgeBoard handle it for you →" | yes | Non-blocking |

## AI Features

| # | Feature | Context Source | Output | Model | Persisted Via |
|---|---------|---------------|--------|-------|--------------|
| 1 | Spec chat (guided conversation) | chat_messages + system prompt with gate structure | Conversational responses guiding user through spec creation | Sonnet | chat_message |
| 2 | Domain research (Phase 1) | User description + web_search results (competitors, reviews, Reddit, G2, Product Hunt) | Competitor analysis + domain summary + user pain points + compliance flags | Sonnet + web_search | research_report |
| 3 | Feature decomposition (Phase 2) | Research report + user direction + competitor feature sets | Nested feature tree with atomic components, cross-referenced against competitors | Sonnet | research_report |
| 4 | Technical requirements (Phase 3) | Feature tree + domain knowledge + compliance flags | Per-component requirements + stack recommendation + compliance requirements + build/cost estimates | Opus | research_report |
| 5 | Competitive gap analysis (Phase 4) | All research data + user input | Opportunities + MVP scope + unique differentiators | Sonnet | research_report |
| 6 | Spec generation | Full research report + full chat history + compliance flags | Complete PROJECT-SPEC.md with Gates 0-5, compliance woven in | Opus | generated_spec |
| 7 | Spec validation (rule-based + AI) | Generated spec | Cross-gate validation, entity/state/permission consistency, spec_quality_score 0-100 | Sonnet | generated_spec.validation_errors + spec_quality_score |
| 8 | ER diagram generation | Gate 1 entities + Gate 4 adjacency list | Mermaid ER diagram source code | Sonnet | generated_spec.er_diagram_mermaid |
| 9 | Build estimation | Entity count + state changes + integrations + complexity | Hours range, API cost, hosting cost, complexity rating | Sonnet | generated_spec metadata |
| 10 | Spec revision | Change request + current spec + research | Updated gates with validation re-run | Sonnet | generated_spec |
| 11 | Industry compliance detection | Domain summary + app description | Detected compliance frameworks (HIPAA, PCI-DSS, FERPA, SOC2, GDPR) with specific requirements per framework | Sonnet | research_report + generated_spec.compliance_requirements |

---

# GATE 5 — INTEGRATIONS

## External Services ForgeSpec Connects To

### Supabase Auth
```yaml
name: Supabase Auth
type: oauth + email_password
auth_method: supabase_auth
endpoints:
  - signUp (email/password)
  - signInWithOAuth (Google)
  - signOut
  - resetPasswordForEmail
  - getUser
data_mapping: Supabase auth.users → internal user entity (profile data in public.users)
sync_direction: inbound (auth events trigger user creation)
```

### Anthropic Claude API
```yaml
name: Anthropic Claude API
type: api_rest
base_url: https://api.anthropic.com/v1
auth_method: api_key
auth_details: "x-api-key header, stored as ANTHROPIC_API_KEY"
endpoints:
  - POST /messages — Chat completions (Sonnet for conversation, Opus for spec generation)
  - POST /messages with tools — Web search enabled for research phases
data_mapping: API responses → chat_messages + research_report + generated_spec
rate_limits: Tier-dependent, typically 4000 RPM
notes: web_search tool used during research phases only. Streaming used for chat responses.
```

