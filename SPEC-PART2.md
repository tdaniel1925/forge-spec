### Resend Email
```yaml
name: Resend
type: api_rest
base_url: https://api.resend.com
auth_method: api_key
auth_details: "Authorization: Bearer {RESEND_API_KEY}"
endpoints:
  - POST /emails — Send transactional emails (welcome, nudges, upsells)
data_mapping: none (outbound only)
sync_direction: outbound
error_handling: retry 2x, log failure, never block user flow
```

### ForgeBoard (Future — Upsell Target)
```yaml
name: ForgeBoard
type: redirect
endpoints:
  - GET /pricing — Redirect from "Build This For Me" CTA
  - POST /api/import-spec — Future: send spec directly to ForgeBoard for auto-build
notes: Initially just a redirect. Future integration sends the generated_spec directly.
```

---

# TECHNICAL NOTES

## Design Language

ForgeSpec follows the same Ledger-style design language as ForgeBoard's marketing page:

**Colors:**
- Background: #ffffff with mesh gradient on hero
- Accent: #FF7F50 (coral) with gradient to #FF6347
- Text: neutral-900 headings, neutral-600 body, neutral-400 secondary
- Dark sections: neutral-950
- Cards: neutral-50, rounded-[32px] to rounded-[40px]

**Typography:**
- Headings: Google Sans Flex, normal weight, tight tracking
- Body: Inter, 400/500
- Labels: uppercase, tracking-widest, 10px, coral accent

**Layout:**
- Floating pill navbar (black, rounded-full)
- Max-w-7xl centered content
- Bento grid layouts for features
- Cards with hover shadow effects

### Route Structure

```
app/
├── (marketing)/              ← Public pages
│   ├── layout.tsx            ← Marketing layout (fonts, no sidebar)
│   ├── page.tsx              ← Landing page (hero, features, how it works, testimonials, CTA)
│   └── pricing/page.tsx      ← Pricing comparison (free ForgeSpec vs paid ForgeBoard)
├── (auth)/                   ← Auth pages
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── reset-password/page.tsx
├── (app)/                    ← Authenticated app
│   ├── layout.tsx            ← App layout (sidebar with spec list, header)
│   ├── dashboard/page.tsx    ← User's specs list with stats
│   ├── spec/
│   │   ├── new/page.tsx      ← Start new spec (redirects to chat)
│   │   └── [id]/
│   │       ├── page.tsx      ← Spec detail (chat + research + generated spec view)
│   │       ├── chat/page.tsx ← Full-screen chat view
│   │       └── review/page.tsx ← Spec review + edit + download
│   └── settings/page.tsx     ← User profile settings
├── (admin)/                  ← Admin only
│   ├── layout.tsx
│   ├── analytics/page.tsx    ← Analytics dashboard
│   ├── users/page.tsx        ← User list + export
│   └── specs/page.tsx        ← All specs (search + filter)
└── api/
    ├── auth/callback/        ← OAuth callback
    ├── chat/                 ← Chat message handler (streams Claude responses)
    ├── research/             ← Research pipeline trigger
    ├── generate/             ← Spec generation trigger
    ├── download/             ← Zip generation + serve
    └── webhooks/
        └── resend/           ← Email delivery webhooks
```

### Key UI Components

**Spec Chat Interface:**
- Full-height chat with message bubbles
- AI messages render markdown with syntax highlighting for code/specs
- Research phase shows a progress indicator: "🔍 Researching competitors..." → "📊 Analyzing features..." → "🔧 Identifying requirements..." → "🎯 Finding opportunities..."
- User sees research results inline in the chat (competitor cards, feature tree, tech stack recommendation)
- Typing indicator while AI is responding
- Chat streams responses in real-time

**Spec Review Interface:**
- Tabbed view: Gate 0 | Gate 1 | Gate 2 | Gate 3 | Gate 4 | Gate 5 | Full Spec
- Each gate rendered as formatted cards (not raw markdown)
- Entity model shown as a visual table with colored status badges
- State changes shown as a flow diagram or numbered list
- "Request Changes" button opens chat with change context
- "Download .forge Zip" button (primary CTA, coral gradient)
- "Build This For Me →" secondary CTA (links to ForgeBoard)

**Dashboard:**
- Grid of spec cards showing: name, status badge, entity count, created date, download count
- Stats bar: "12 specs created · 8 downloaded · 3 in progress"
- "New Spec" button (prominent, coral)
- Search + filter (by status, by date)
- Empty state: "Create your first spec — describe any app idea and we'll research it for you"

**Research Progress Card (shown during research phases):**
```
┌─────────────────────────────────────────┐
│ 🔍 Deep Research in Progress            │
│                                          │
│ ✅ Phase 1: Domain Analysis              │
│    Found 7 competitors, 45 features      │
│ ⏳ Phase 2: Feature Decomposition        │
│    Breaking down into atomic components  │
│ ○ Phase 3: Technical Requirements        │
│ ○ Phase 4: Competitive Gap Analysis      │
│                                          │
│ [━━━━━━━━━━━━░░░░░░░░] 45%             │
└─────────────────────────────────────────┘
```

**Feature Decomposition Tree (rendered in chat):**
```
📧 Email Client
├── 📥 Inbox
│   ├── Thread grouping
│   ├── Read/unread state
│   ├── Star/flag
│   ├── Bulk select + actions
│   ├── Search with filters
│   ├── Infinite scroll
│   ├── Pull to refresh (mobile)
│   ├── Realtime new email indicator
│   ├── Swipe actions (archive/delete)
│   ├── Keyboard shortcuts
│   ├── Label assignment + creation
│   ├── Snooze + snooze picker
│   └── Undo actions (toast)
├── ✏️ Compose
│   ├── Rich text editor (TipTap)
│   ├── Image paste (clipboard)
│   ├── Image paste (drag & drop)
│   ├── Attachment upload
│   ├── Attachment preview
│   ├── CC / BCC / Reply-To fields
│   ├── Contact autocomplete
│   ├── Signature insertion
│   ├── Draft auto-save (30s)
│   ├── Send scheduling
│   ├── Template insertion
│   ├── Emoji picker
│   └── Spell check
├── 🔍 Search
│   ├── Full-text search
│   ├── Filter by sender
│   ├── Filter by date range
│   ├── Filter by label
│   ├── Filter by attachment
│   ├── Search suggestions
│   └── Saved searches
└── ⚙️ Settings
    ├── Account management
    ├── Signature editor
    ├── Label management
    ├── Notification preferences
    ├── Theme (light/dark)
    └── Connected accounts (OAuth)
```

### Marketing Landing Page (same Ledger-style)

**Sections:**
1. **Nav** — Floating pill: ForgeSpec logo, Features, How It Works, links, "Get Started Free" CTA
2. **Hero** — Mesh gradient. Badge: "Free AI Spec Generator". Headline: "Turn Any App Idea Into a Production-Ready Blueprint." Subhead: "ForgeSpec researches your domain, decomposes every feature into atomic components, and generates a spec document ready for Claude Code." Email signup or "Get Started Free" button. Below: mockup of a spec being generated with research phases visible.
3. **Social proof** — "Trusted by developers and agencies worldwide" + metrics: "2,400+ specs generated · 180+ app types · 94% quality score"
4. **How It Works** — 4 steps visual flow:
   - Step 1: "Describe" — Tell us what you want to build
   - Step 2: "Research" — AI analyzes competitors and decomposes features
   - Step 3: "Generate" — Production-ready spec with every detail covered
   - Step 4: "Build" — Download .forge zip, open Claude Code, build
5. **Feature Bento Grid** — 4 cards:
   - Deep Research (shows competitor analysis mockup)
   - Granular Decomposition (shows feature tree mockup)
   - Multi-Stack Intelligence (shows stack recommendation)
   - One-Click Download (shows .forge zip contents)
6. **Before/After** — Left: vague description "I want an email client." Right: 200+ atomic components organized by feature area. Shows the transformation.
7. **Testimonials** — 3 cards
8. **CTA** — "Ready to Build Something?" + signup form
9. **Footer** — Dark card, links, newsletter

### Environment Variables

```
# Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Email
RESEND_API_KEY=re_xxx
NOTIFICATION_EMAIL=daniel@botmakers.ai

# App
NEXT_PUBLIC_APP_URL=https://forgespec.ai
FORGEBOARD_URL=https://forgeboard.ai
```

### .forge Zip Contents (what users download)

```
{project-name}/
├── PROJECT-SPEC.md           ← Generated spec (800-1200 lines)
├── CLAUDE.md                 ← Claude Code instructions
├── .cursorrules              ← Cursor IDE rules
├── .claude/
│   └── settings.json         ← Auto-approve configuration
└── .forge/
    ├── PROJECT-SPEC.md       ← Copy (pattern expects it here too)
    ├── system/
    │   ├── CLAUDE.md
    │   ├── BUILD-STAGES.md
    │   ├── BUILD-STATE.md
    │   └── cursorrules
    ├── patterns/             ← All 28 pattern files
    │   ├── INDEX.md
    │   ├── feature-auth-flow.md
    │   ├── feature-deploy-pipeline.md
    │   ├── ... (all patterns)
    │   └── infra-testing.md
    └── design/               ← 5 design files
        ├── INDEX.md
        ├── color-system.md
        ├── typography.md
        ├── dark-mode.md
        └── animations.md
```

### Model Configuration

```python
CHAT_MODEL = "claude-sonnet-4-5-20250929"
RESEARCH_MODEL = "claude-sonnet-4-5-20250929"  # with web_search tool
SPEC_GENERATION_MODEL = "claude-opus-4-6"       # highest quality for final spec
SPEC_REVISION_MODEL = "claude-sonnet-4-5-20250929"
VALIDATION_MODEL = "claude-sonnet-4-5-20250929"
TECH_REQUIREMENTS_MODEL = "claude-opus-4-6"     # needs deep technical knowledge
```

### Estimated API Cost Per Spec

| Phase | Model | Est. Tokens | Est. Cost |
|-------|-------|-------------|-----------|
| Chat (10 messages) | Sonnet | ~20K | ~$0.15 |
| Research Phase 1 | Sonnet + search | ~15K | ~$0.12 |
| Research Phase 2 | Sonnet | ~25K | ~$0.20 |
| Research Phase 3 | Opus | ~20K | ~$0.60 |
| Research Phase 4 | Sonnet | ~10K | ~$0.08 |
| Spec Generation | Opus | ~40K | ~$1.20 |
| Validation | Sonnet | ~5K | ~$0.04 |
| **Total per spec** | | | **~$2.40** |

At $0 revenue per spec, this is pure lead generation cost. If 10% of users convert to ForgeBoard ($199/mo), each free spec costs $2.40 but generates $19.90 in expected value. 8x ROI.

---

# GATES FROZEN

---

# End of PROJECT-SPEC.md
