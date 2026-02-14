# TYPOGRAPHY
# Font selection and type scale for every project.

## Font Selection

Pick fonts that match the app's domain. NEVER use Inter, Roboto, Arial, or system defaults.

### Recommended Pairings

| Domain | Heading Font | Body Font |
|--------|-------------|-----------|
| Professional/Legal | DM Sans, Plus Jakarta Sans | Same at regular weight |
| Finance/Enterprise | Outfit, Sora | Same at regular weight |
| Creative/Modern | Cabinet Grotesk, Clash Display | Satoshi, General Sans |
| SaaS/Productivity | Manrope, Plus Jakarta Sans | Same at regular weight |
| Healthcare/Clean | Nunito Sans, Source Sans 3 | Same at regular weight |

### Implementation

```typescript
// src/app/layout.tsx
import { Plus_Jakarta_Sans } from "next/font/google"

const fontHeading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
})

const fontBody = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500"],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontHeading.variable} ${fontBody.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
```

```typescript
// tailwind.config.ts
fontFamily: {
  heading: ["var(--font-heading)", "sans-serif"],
  body: ["var(--font-body)", "sans-serif"],
  mono: ["JetBrains Mono", "Fira Code", "monospace"],
}
```

## Type Scale

| Element | Class | Usage |
|---------|-------|-------|
| Page title | `text-3xl font-heading font-bold tracking-tight` | Top of every page |
| Section heading | `text-xl font-heading font-semibold tracking-tight` | Section dividers |
| Card title | `text-lg font-heading font-semibold` | Card headers |
| Body text | `text-sm font-body` | Default content |
| Caption/Label | `text-xs font-medium tracking-wide uppercase text-muted-foreground` | Labels, metadata |
| Data/Numbers | `text-sm font-mono font-medium` | IDs, counts, timestamps |
| Large metric | `text-4xl font-heading font-bold tracking-tight` | KPI numbers on dashboards |
