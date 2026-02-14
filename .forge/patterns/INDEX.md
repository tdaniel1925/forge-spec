# PATTERN INDEX
# Claude Code: Read this to find the right pattern for what you're building.
# Load ONLY the files relevant to your current stage and task.

## Layouts
- `layout-app-shell.md` — Main app wrapper: sidebar + topbar + content. Use for every authenticated app.
- `layout-dashboard.md` — KPI cards + chart grid + activity feed. Use for overview/analytics pages.
- `layout-list-page.md` — Page header + filters + data table/cards + pagination. Use for every entity list.
- `layout-form-page.md` — Form with sections, validation, submit/cancel. Use for every create/edit page.

## Core Components
- `component-data-table.md` — shadcn data table: sorting, filtering, column visibility, row actions, bulk select, pagination.
- `component-sidebar-nav.md` — Collapsible sidebar: icons, sections, active states, collapse toggle.
- `component-command-palette.md` — Cmd+K search across entities. Global shortcut.
- `component-status-badge.md` — Consistent status indicators with color mapping.
- `component-empty-state.md` — Empty list/table states with icon + message + CTA.
- `component-loading-skeleton.md` — Skeleton screens matching each layout type.
- `component-chat-interface.md` — AI chat: message bubbles, typing indicator, streaming, input bar.

## Features
- `feature-auth-flow.md` — Sign in, sign up, forgot password, email verify, protected routes.
- `feature-notifications.md` — Toast notifications + dropdown notification center in topbar.
- `feature-file-upload.md` — Drag/drop upload with preview, progress, type validation, Supabase Storage.
- `feature-activity-timeline.md` — Chronological event feed. Maps to PRD-Forge Stage 5 events.
- `feature-deploy-pipeline.md` — One-click deploy: GitHub repo + Supabase project + Vercel deploy. Full automation with CLI tokens.

## Infrastructure
- `infra-zod-schemas.md` — Reusable Zod schemas: email, phone, URL, currency, dates, nested objects.
- `infra-forms.md` — React Hook Form + Zod: field errors, async validation, conditional fields, dynamic arrays.
- `infra-stripe.md` — Stripe: checkout, subscriptions, customer portal, webhooks, pricing page.
- `infra-server-actions.md` — Complete server action pattern: validate, check perms, execute, optimistic UI.
- `infra-error-handling.md` — Error boundary, toast errors, form errors, API errors, consistent pattern.
- `infra-email.md` — Transactional email via Resend: templates, welcome, reset, notifications.
- `infra-search-filter.md` — URL-based search params, debounced search, multi-filter chips, saved presets.
- `infra-pagination.md` — Cursor and offset pagination, infinite scroll, load more.
- `infra-realtime.md` — Supabase realtime subscriptions, live updates, presence.
- `infra-multi-step-form.md` — Wizard: step progress, per-step validation, draft save, navigation.
- `infra-testing.md` — Vitest (unit/integration) + Playwright (E2E) pipeline. Tests per stage as build gates. Playwright final gate before completion.
