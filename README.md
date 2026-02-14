# ForgeSpec

**Turn any app idea into a production-ready spec in minutes.**

ForgeSpec is a free, AI-powered specification generator that performs deep domain research, decomposes features into atomic components, and produces downloadable `.forge` packages ready for Claude Code.

Built with the PRD-Forge Build System following strict 7-layer architecture.

---

## 🎯 What is ForgeSpec?

ForgeSpec transforms vague app ideas into comprehensive, production-ready PROJECT-SPEC.md documents through:

1. **Deep Research** - AI analyzes competitors, user pain points, and technical requirements
2. **Granular Decomposition** - Every feature broken down into atomic components
3. **Production-Ready Output** - Downloadable .forge zip works immediately in Claude Code
4. **Saved Specs** - All specs saved, versioned, and refinable over time

---

## ✨ Features

### 🔍 4-Phase Research Pipeline
- **Phase 1:** Domain analysis (competitors, pain points, compliance)
- **Phase 2:** Feature decomposition (atomic components)
- **Phase 3:** Technical requirements (stack, libraries, estimates)
- **Phase 4:** Competitive gap analysis (opportunities, MVP scope)

### 🤖 AI-Powered Generation
- Claude Sonnet 4.5 for research and chat
- Claude Opus 4 for spec generation
- Web search integration for real-time competitor analysis
- Streaming chat interface with progress tracking

### 📦 Complete .forge Output
- PROJECT-SPEC.md (Gates 0-5)
- Build system files (CLAUDE.md, BUILD-STAGES.md)
- 28 reusable patterns
- Design system files
- Ready for Claude Code

### 🔐 Enterprise-Grade Infrastructure
- Supabase (PostgreSQL + Auth + RLS)
- Row-level security on all tables
- Event system (append-only audit log)
- 10 automation rules (email, analytics, workflows)
- Rate limiting and error handling
- Fallback behavior with caching

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/tdaniel1925/forge-spec.git
cd forge-spec

# Install dependencies
npm install

# Set up environment variables (see SETUP-GUIDE.md)
cp .env.example .env.local
# Edit .env.local with your API keys

# Run database migrations
supabase db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**📖 Full setup instructions:** See [SETUP-GUIDE.md](./SETUP-GUIDE.md)

---

## 🏗️ Architecture

ForgeSpec follows a strict 7-layer architecture (PRD-Forge Build System):

```
Layer 6: AI Layer          ← Provider abstraction, rate limiting, fallback
Layer 5: Automation         ← Email, analytics, scheduled jobs
Layer 4: Event System       ← Append-only audit log
Layer 3: Vertical Slice     ← Complete workflow (chat → research → generate)
Layer 2: CRUD              ← Server actions, validation, permissions
Layer 1: Auth & Spine      ← Supabase Auth, session management
Layer 0: Schema & Types    ← Database schema, RLS policies
```

**Zero architecture violations.** Higher layers depend only on lower layers.

---

## 📊 Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui, Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Email + Google OAuth)
- **AI:** Anthropic Claude API (Sonnet 4.5 + Opus 4)
- **Email:** Resend
- **Deployment:** Vercel

---

## 📁 Project Structure

```
forge-spec/
├── .forge/                    # Build system files
│   ├── system/               # Build stages, rules, state
│   ├── patterns/             # 28 reusable patterns
│   └── design/               # Design system files
├── supabase/
│   └── migrations/           # 4 database migrations
├── src/
│   ├── app/                  # Next.js app router
│   │   ├── (auth)/          # Auth pages
│   │   ├── (app)/           # Protected app pages
│   │   └── api/             # API routes
│   ├── components/          # React components
│   ├── lib/
│   │   ├── actions/         # Server actions (CRUD)
│   │   ├── ai/              # AI layer (Stage 7)
│   │   ├── automation/      # Automation system
│   │   ├── events/          # Event system
│   │   └── supabase/        # Supabase client
│   └── types/               # TypeScript types
├── CLAUDE.md                # Build rules
├── PROJECT-SPEC.md          # Full specification
├── BUILD-STATE.md           # Build completion status
└── SETUP-GUIDE.md           # Setup instructions
```

---

## 🔑 Environment Variables

Required environment variables (see [SETUP-GUIDE.md](./SETUP-GUIDE.md) for details):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
NOTIFICATION_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
FORGEBOARD_URL=
```

---

## 📈 Stats

- **Total Files:** 87
- **Total Lines:** 26,159
- **Total Entities:** 13 (9 business + 4 system)
- **Total State Changes:** 32
- **Total Event Types:** 45
- **Total Automation Rules:** 10
- **Total AI Features:** 11
- **Architecture Violations:** 0

---

## 🎯 Use Cases

1. **Solo Developers** - Get a complete spec before writing code
2. **Agencies** - Generate client proposals with technical details
3. **Product Managers** - Document features with granular requirements
4. **CTOs** - Evaluate technical feasibility before committing
5. **Educators** - Teach system design with real examples

---

## 💰 Cost

ForgeSpec is **free forever** for spec generation.

**API Costs:**
- ~$2.40 per spec (Anthropic API)
- 100 free emails/day (Resend)
- Free Supabase tier (500MB database)

**Upsells:**
- ForgeBoard ($199-499/mo) - Automated builds
- BotMakers ($5K-15K) - Done-for-you development

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- Design inspired by [Ledger](https://www.ledger.com/)
- Powered by [Anthropic Claude API](https://www.anthropic.com/)
- Database by [Supabase](https://supabase.com/)
- Email by [Resend](https://resend.com/)

---

## 📞 Support

- **GitHub Issues:** [Report bugs](https://github.com/tdaniel1925/forge-spec/issues)
- **Documentation:** [Setup Guide](./SETUP-GUIDE.md)
- **Email:** support@forgespec.ai (coming soon)

---

## 🗺️ Roadmap

- [ ] Multi-language support
- [ ] Collaborative spec editing
- [ ] GitHub integration (auto-PR creation)
- [ ] Custom pattern library
- [ ] API access for programmatic use
- [ ] ForgeBoard integration (one-click build)

---

**🎉 Ready to build something amazing? [Get started now!](./SETUP-GUIDE.md)**

---

Built with ❤️ using [Claude Code](https://claude.com/claude-code)
