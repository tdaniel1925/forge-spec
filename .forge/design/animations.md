# ANIMATIONS
# Framer Motion patterns for every app.

## Install
```bash
npm install framer-motion
```

## Page Transitions

Wrap page content in every page component:
```typescript
"use client"
import { motion } from "framer-motion"

export default function Page() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* page content */}
    </motion.div>
  )
}
```

## List Stagger

For any list of cards, table rows, or repeated items:
```typescript
"use client"
import { motion } from "framer-motion"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export function ItemList({ items }: { items: Item[] }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {items.map((i) => (
        <motion.div key={i.id} variants={item}>
          <ItemCard item={i} />
        </motion.div>
      ))}
    </motion.div>
  )
}
```

## Micro-Interactions

### Card Hover
```typescript
<motion.div
  whileHover={{ y: -2 }}
  transition={{ duration: 0.2 }}
  className="cursor-pointer"
>
  <Card>...</Card>
</motion.div>
```

### Button Press
```typescript
<motion.button
  whileTap={{ scale: 0.97 }}
  className="..."
>
  Click me
</motion.button>
```

### Collapse/Expand
```typescript
import { AnimatePresence, motion } from "framer-motion"

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

### Modal/Dialog Entry
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.15 }}
>
  {dialogContent}
</motion.div>
```

### Number Counter (for KPIs)
```typescript
"use client"
import { useEffect, useRef } from "react"
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion"

export function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, { duration: 1, ease: "easeOut" })
    }
  }, [isInView, value, motionValue])

  return <motion.span ref={ref}>{rounded}</motion.span>
}
```

## Rules

- Durations: 0.15s–0.3s for micro-interactions, 0.3s–0.5s for page transitions
- Easing: `easeOut` for entrances, `easeIn` for exits
- Stagger delays: 0.03s–0.08s per item
- Use `AnimatePresence` with `mode="wait"` for route transitions
- Never animate width/height without `layout` prop or explicit overflow hidden
- Keep it subtle — animations should feel natural, not flashy
