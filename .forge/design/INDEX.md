# DESIGN INDEX
# Claude Code: Read this file to find the right design reference for what you're building.
# Load ONLY the files you need — not all of them.

## Color & Theme
- `color-system.md` — AI-generated palette based on app description, CSS variables, shadcn theme config
- `dark-mode.md` — next-themes setup, dark mode CSS variables, component dark mode rules
- `typography.md` — Google Font selection, font pairing rules, type scale, font loading in Next.js

## Animation & Motion
- `animations.md` — Framer Motion patterns: page transitions, list stagger, micro-interactions, AnimatePresence

## General Rules
- All colors via CSS variables — never hardcode hex/rgb
- shadcn/ui for forms, dialogs, controls
- Tremor for dashboards, charts, data visualization
- Framer Motion for all animations
- Every app supports light + dark mode
- Every app uses distinctive Google Fonts — never Inter, Roboto, Arial, or system defaults
