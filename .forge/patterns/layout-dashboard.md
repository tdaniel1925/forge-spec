# PATTERN: Dashboard Layout
# Use for: Overview/analytics pages with KPIs, charts, and activity feeds.
# Apply in: Stage 3+ (dashboard pages)

## Structure
```
[ Page Title ]                    [ Date Range Picker ]
[ KPI Card ] [ KPI Card ] [ KPI Card ] [ KPI Card ]
[ Chart (wide) ]          [ Chart (narrow) ]
[ Recent Activity Table ]
```

## Implementation

### Dashboard Page
```typescript
// src/app/(dashboard)/page.tsx
"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, BarChart, DonutChart } from "@tremor/react"
import { AnimatedNumber } from "@/components/animated-number"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export default function DashboardPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h1>
        {/* Date range picker here */}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={item}>
            <KPICard {...kpi} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <AreaChart
                data={chartData}
                index="date"
                categories={["revenue"]}
                className="h-72"
              />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={donutData}
                index="name"
                category="value"
                className="h-72"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Activity table or timeline here */}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function KPICard({ label, value, change, trend }: KPIProps) {
  const isPositive = trend === "up"
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">{label}</p>
        <p className="text-4xl font-heading font-bold tracking-tight mt-2">
          <AnimatedNumber value={value} />
        </p>
        <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          <span>{change}%</span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Tremor Chart Theming
```typescript
// Use CSS variable colors for charts
const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]
```

## Responsive
- KPI cards: 1 col mobile, 2 col tablet, 4 col desktop
- Charts: stack vertically on mobile, side by side on desktop
- Activity table: becomes card list on mobile
