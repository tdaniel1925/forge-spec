# DESIGN-SYSTEM.md — ForgeSpec Design Language

> **Ledger-style Modern SaaS Design**
> Generated from Gate 0 app description: ForgeSpec is a free AI-powered spec generator that turns any app idea into a production-ready specification through deep research and granular decomposition.

---

## COLOR SYSTEM

### Brand Colors (Light Mode)

```css
/* Primary Accent — Coral Gradient */
--color-primary: #FF7F50;        /* Coral */
--color-primary-dark: #FF6347;   /* Tomato */
--color-primary-gradient: linear-gradient(135deg, #FF7F50 0%, #FF6347 100%);

/* Neutrals */
--color-neutral-50: #fafafa;
--color-neutral-100: #f5f5f5;
--color-neutral-200: #e5e5e5;
--color-neutral-300: #d4d4d4;
--color-neutral-400: #a3a3a3;    /* Secondary text */
--color-neutral-500: #737373;
--color-neutral-600: #525252;    /* Body text */
--color-neutral-700: #404040;
--color-neutral-800: #262626;
--color-neutral-900: #171717;    /* Headings */
--color-neutral-950: #0a0a0a;    /* Dark sections */

/* Backgrounds */
--color-bg-primary: #ffffff;
--color-bg-secondary: #fafafa;
--color-bg-card: #f5f5f5;
--color-bg-dark: #0a0a0a;

/* Semantic Colors */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;
```

### Brand Colors (Dark Mode)

```css
/* Dark Mode Overrides */
--color-bg-primary: #0a0a0a;
--color-bg-secondary: #171717;
--color-bg-card: #262626;
--color-bg-dark: #fafafa;

/* Inverted neutrals for dark mode */
--color-neutral-900: #fafafa;    /* Headings */
--color-neutral-600: #d4d4d4;    /* Body text */
--color-neutral-400: #737373;    /* Secondary text */
--color-neutral-50: #171717;     /* Card backgrounds */
```

### Color Usage Guidelines

| Element | Light Mode | Dark Mode | Purpose |
|---------|-----------|-----------|---------|
| Page background | `#ffffff` | `#0a0a0a` | Main canvas |
| Card background | `#f5f5f5` | `#262626` | Elevated surfaces |
| Primary CTA | Coral gradient | Coral gradient | Action buttons |
| Headings | `neutral-900` | `neutral-900` (inverted) | Typography |
| Body text | `neutral-600` | `neutral-600` (inverted) | Typography |
| Secondary text | `neutral-400` | `neutral-400` (inverted) | Labels, meta |
| Borders | `neutral-200` | `neutral-800` | Dividers |
| Hover states | `neutral-100` | `neutral-900` | Interactive feedback |

---

## TYPOGRAPHY

### Font Families

```css
/* Headings */
--font-heading: 'Google Sans Flex', system-ui, -apple-system, sans-serif;

/* Body */
--font-body: 'Inter', system-ui, -apple-system, sans-serif;

/* Monospace */
--font-mono: 'Fira Code', 'Courier New', monospace;
```

### Type Scale

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| **Display** | Google Sans Flex | 56px / 3.5rem | 400 | 1.1 | -0.02em |
| **H1** | Google Sans Flex | 48px / 3rem | 400 | 1.15 | -0.02em |
| **H2** | Google Sans Flex | 36px / 2.25rem | 400 | 1.2 | -0.01em |
| **H3** | Google Sans Flex | 28px / 1.75rem | 400 | 1.3 | -0.01em |
| **H4** | Google Sans Flex | 20px / 1.25rem | 500 | 1.4 | 0 |
| **Body Large** | Inter | 18px / 1.125rem | 400 | 1.6 | 0 |
| **Body** | Inter | 16px / 1rem | 400 | 1.6 | 0 |
| **Body Small** | Inter | 14px / 0.875rem | 400 | 1.5 | 0 |
| **Label** | Inter | 10px / 0.625rem | 500 | 1.4 | 0.1em (widest) |
| **Code** | Fira Code | 14px / 0.875rem | 400 | 1.5 | 0 |

### Typography Classes

```css
.text-display { font-family: var(--font-heading); font-size: 3.5rem; font-weight: 400; line-height: 1.1; letter-spacing: -0.02em; }
.text-h1 { font-family: var(--font-heading); font-size: 3rem; font-weight: 400; line-height: 1.15; letter-spacing: -0.02em; }
.text-h2 { font-family: var(--font-heading); font-size: 2.25rem; font-weight: 400; line-height: 1.2; letter-spacing: -0.01em; }
.text-h3 { font-family: var(--font-heading); font-size: 1.75rem; font-weight: 400; line-height: 1.3; letter-spacing: -0.01em; }
.text-h4 { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 500; line-height: 1.4; }
.text-body-lg { font-family: var(--font-body); font-size: 1.125rem; font-weight: 400; line-height: 1.6; }
.text-body { font-family: var(--font-body); font-size: 1rem; font-weight: 400; line-height: 1.6; }
.text-body-sm { font-family: var(--font-body); font-size: 0.875rem; font-weight: 400; line-height: 1.5; }
.text-label { font-family: var(--font-body); font-size: 0.625rem; font-weight: 500; line-height: 1.4; letter-spacing: 0.1em; text-transform: uppercase; }
```

---

## COMPONENTS

### Buttons

**Primary CTA (Coral Gradient)**
```css
.btn-primary {
  background: linear-gradient(135deg, #FF7F50 0%, #FF6347 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(255, 127, 80, 0.3);
}
```

**Secondary**
```css
.btn-secondary {
  background: var(--color-neutral-50);
  color: var(--color-neutral-900);
  border: 1px solid var(--color-neutral-200);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
}
.btn-secondary:hover {
  background: var(--color-neutral-100);
}
```

**Ghost**
```css
.btn-ghost {
  background: transparent;
  color: var(--color-neutral-600);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
}
.btn-ghost:hover {
  background: var(--color-neutral-50);
}
```

### Cards

**Standard Card**
```css
.card {
  background: var(--color-bg-card);
  border-radius: 32px;
  padding: 32px;
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}
```

**Large Card (Bento Grid)**
```css
.card-large {
  background: var(--color-bg-card);
  border-radius: 40px;
  padding: 48px;
}
```

**Dark Card**
```css
.card-dark {
  background: var(--color-neutral-950);
  color: var(--color-neutral-50);
  border-radius: 32px;
  padding: 32px;
}
```

### Forms

**Input Field (shadcn/ui style)**
```css
.input {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  font-family: var(--font-body);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 127, 80, 0.1);
  outline: none;
}
```

**Select**
```css
.select {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
}
```

**Textarea**
```css
.textarea {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  font-family: var(--font-body);
  resize: vertical;
  min-height: 120px;
}
```

### Navigation

**Floating Pill Navbar**
```css
.navbar {
  background: var(--color-neutral-950);
  color: white;
  border-radius: 9999px;
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}
.navbar-link {
  color: var(--color-neutral-300);
  padding: 8px 16px;
  border-radius: 9999px;
  transition: background 0.2s, color 0.2s;
}
.navbar-link:hover {
  background: var(--color-neutral-800);
  color: white;
}
```

### Status Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success { background: #dcfce7; color: #166534; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-error { background: #fee2e2; color: #991b1b; }
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-neutral { background: var(--color-neutral-100); color: var(--color-neutral-700); }
```

---

## LAYOUT PATTERNS

### Container Widths

```css
.container-sm { max-width: 640px; margin: 0 auto; }
.container-md { max-width: 768px; margin: 0 auto; }
.container-lg { max-width: 1024px; margin: 0 auto; }
.container-xl { max-width: 1280px; margin: 0 auto; }
.container-2xl { max-width: 1536px; margin: 0 auto; }
.container-forgespec { max-width: 1280px; margin: 0 auto; } /* Default for ForgeSpec */
```

### Grid Layouts

**Bento Grid (Feature Cards)**
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}
```

**Dashboard Grid**
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}
```

**Two-Column Layout**
```css
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}
@media (max-width: 768px) {
  .two-column {
    grid-template-columns: 1fr;
  }
}
```

### Spacing Scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

---

## ANIMATIONS

### Transitions

```css
/* Standard ease */
.transition-standard { transition: all 0.2s ease; }

/* Smooth ease */
.transition-smooth { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

/* Bounce */
.transition-bounce { transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
```

### Hover Effects

**Card Lift**
```css
.hover-lift {
  transition: transform 0.3s, box-shadow 0.3s;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}
```

**Scale**
```css
.hover-scale {
  transition: transform 0.2s;
}
.hover-scale:hover {
  transform: scale(1.02);
}
```

### Loading States

**Skeleton**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-neutral-100) 25%,
    var(--color-neutral-200) 50%,
    var(--color-neutral-100) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Spinner**
```css
.spinner {
  border: 3px solid var(--color-neutral-200);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spinner-rotate 0.8s linear infinite;
}

@keyframes spinner-rotate {
  to { transform: rotate(360deg); }
}
```

### Framer Motion Variants

```typescript
// Page transitions
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

// Stagger children
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Card entrance
export const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } }
};

// Slide in from right
export const slideIn = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.3 } }
};
```

---

## SPECIFIC COMPONENTS (ForgeSpec)

### Hero Section

**Mesh Gradient Background**
```css
.hero-gradient {
  background:
    radial-gradient(at 0% 0%, rgba(255, 127, 80, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(255, 99, 71, 0.1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(255, 127, 80, 0.08) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(255, 99, 71, 0.12) 0px, transparent 50%),
    #ffffff;
}
```

### Research Progress Card

```css
.research-progress {
  background: var(--color-bg-card);
  border-radius: 24px;
  padding: 24px;
  border: 1px solid var(--color-neutral-200);
}

.research-phase {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.research-phase-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.research-phase-icon.complete {
  background: #dcfce7;
  color: #166534;
}

.research-phase-icon.active {
  background: #dbeafe;
  color: #1e40af;
}

.research-phase-icon.pending {
  background: var(--color-neutral-100);
  color: var(--color-neutral-400);
}

.progress-bar {
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF7F50 0%, #FF6347 100%);
  transition: width 0.5s ease;
}
```

### Chat Interface

```css
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(100vh - 80px);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-message {
  max-width: 80%;
  padding: 16px 20px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.6;
}

.chat-message.user {
  align-self: flex-end;
  background: var(--color-primary-gradient);
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-message.assistant {
  align-self: flex-start;
  background: var(--color-bg-card);
  color: var(--color-neutral-900);
  border-bottom-left-radius: 4px;
}

.chat-input-container {
  padding: 16px 24px;
  border-top: 1px solid var(--color-neutral-200);
  background: var(--color-bg-primary);
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 16px 20px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-neutral-400);
  animation: typing-bounce 1.4s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}
```

### Spec Review Interface

```css
.spec-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--color-neutral-200);
  padding: 0 24px;
}

.spec-tab {
  padding: 12px 20px;
  font-weight: 500;
  color: var(--color-neutral-600);
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
  cursor: pointer;
}

.spec-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.spec-tab:hover:not(.active) {
  color: var(--color-neutral-900);
}

.spec-content {
  padding: 32px 24px;
}

.entity-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-neutral-200);
}

.entity-table th {
  background: var(--color-neutral-50);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--color-neutral-900);
  font-size: 14px;
}

.entity-table td {
  padding: 12px 16px;
  border-top: 1px solid var(--color-neutral-200);
  font-size: 14px;
  color: var(--color-neutral-700);
}
```

---

## DARK MODE IMPLEMENTATION

### Next.js + next-themes Setup

```typescript
// app/providers.tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

### CSS Variables (Automatic Dark Mode)

```css
/* globals.css */
:root {
  /* Light mode variables (default) */
}

.dark {
  /* Dark mode overrides */
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #171717;
  --color-bg-card: #262626;
  --color-neutral-900: #fafafa;
  --color-neutral-600: #d4d4d4;
  /* etc. */
}
```

---

## COMPONENT LIBRARIES

### Required Dependencies

```json
{
  "dependencies": {
    "next-themes": "^0.2.1",
    "framer-motion": "^10.0.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### Library Usage Guide

- **shadcn/ui**: All forms, dialogs, dropdowns, selects, tabs
- **Tremor**: Dashboard charts, analytics visualizations (admin panel)
- **Framer Motion**: Page transitions, card animations, micro-interactions
- **next-themes**: Dark mode toggle and management

---

## RESPONSIVE BREAKPOINTS

```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Responsive Typography

| Breakpoint | Display | H1 | H2 | H3 | Body |
|------------|---------|----|----|----|----- |
| Mobile (<640px) | 36px | 32px | 24px | 20px | 16px |
| Tablet (≥768px) | 48px | 40px | 30px | 24px | 16px |
| Desktop (≥1024px) | 56px | 48px | 36px | 28px | 16px |

---

## ACCESSIBILITY

### Focus States

```css
.focus-visible:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### ARIA Labels

- All interactive elements must have accessible labels
- Form inputs must have associated labels or aria-label
- Buttons must have descriptive text or aria-label
- Loading states must announce to screen readers

### Color Contrast

- All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Interactive elements must have 3:1 contrast against background

---

## End of DESIGN-SYSTEM.md
