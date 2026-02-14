# COLOR SYSTEM
# How to generate and apply the project's color palette.

## Palette Generation

Read the app description in PROJECT-SPEC.md Gate 0. Generate a palette that matches the domain:

- **Professional/Enterprise** (law, finance, healthcare): Deep blues, slate, navy. Clean neutrals. Minimal accents. Trustworthy.
- **Creative/Consumer** (social, entertainment): Vibrant primaries, bold accents, energetic contrasts.
- **Productivity/SaaS** (project management, CRM, dashboards): Modern neutrals + one strong brand color. Clean.
- **E-commerce/Marketplace**: Warm, inviting tones. High-contrast CTAs.

## CSS Variables

Define in `src/app/globals.css`. All values in HSL format (number number% number%) without the hsl() wrapper — shadcn requires this format.

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: [generated];
    --primary-foreground: [generated];
    --secondary: [generated];
    --secondary-foreground: [generated];
    --muted: [generated];
    --muted-foreground: [generated];
    --accent: [generated];
    --accent-foreground: [generated];
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: [match primary];
    --success: 142 71% 45%;
    --success-foreground: 0 0% 98%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 9%;
    --info: 199 89% 48%;
    --info-foreground: 0 0% 98%;
    --chart-1: [generated];
    --chart-2: [generated];
    --chart-3: [generated];
    --chart-4: [generated];
    --chart-5: [generated];
    --radius: 0.625rem;
  }

  .dark {
    --background: 222 47% 6%;
    --foreground: 210 40% 96%;
    --card: 222 47% 8%;
    --card-foreground: 210 40% 96%;
    --popover: 222 47% 8%;
    --popover-foreground: 210 40% 96%;
    --primary: [generated — adjust saturation/lightness for dark];
    --primary-foreground: [generated];
    --secondary: [generated];
    --secondary-foreground: [generated];
    --muted: 217 33% 14%;
    --muted-foreground: 215 20% 55%;
    --accent: [generated];
    --accent-foreground: [generated];
    --destructive: 0 62% 50%;
    --destructive-foreground: 0 0% 98%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: [match primary];
    --success: 142 71% 35%;
    --success-foreground: 0 0% 98%;
    --warning: 38 92% 45%;
    --warning-foreground: 0 0% 9%;
    --info: 199 89% 40%;
    --info-foreground: 0 0% 98%;
    --chart-1: [generated];
    --chart-2: [generated];
    --chart-3: [generated];
    --chart-4: [generated];
    --chart-5: [generated];
  }
}
```

## Dark Mode Palette Rules

- Backgrounds use rich dark tones, NOT pure black. Example: `222 47% 6%` not `0 0% 0%`
- Reduce foreground contrast slightly — `210 40% 96%` not `0 0% 100%`
- Cards/elevated surfaces are slightly lighter than base background
- Primary colors may need lower saturation and adjusted lightness for dark
- Borders become subtle — close to background color
- Shadows reduce or switch to slightly lighter glows

## Tailwind Usage

Always use semantic classes that reference the CSS variables:
```
bg-background text-foreground
bg-card text-card-foreground
bg-primary text-primary-foreground
bg-muted text-muted-foreground
border-border
```

Never use raw Tailwind colors like `bg-blue-500` or `text-gray-900`.
