# PATTERN: Multi-Step Form (Wizard)
# Use for: Complex forms with multiple sections that need step-by-step flow.
# Apply in: Stage 3+ (onboarding, complex entity creation)

## Implementation

```typescript
// src/components/multi-step-form.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  title: string
  description?: string
  component: React.ComponentType<{ onNext: (data: any) => void; data: any }>
}

interface MultiStepFormProps {
  steps: Step[]
  onComplete: (data: Record<string, any>) => void
}

export function MultiStepForm({ steps, onComplete }: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const handleNext = (stepData: any) => {
    const newData = { ...formData, ...stepData }
    setFormData(newData)

    if (currentStep === steps.length - 1) {
      onComplete(newData)
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const StepComponent = steps[currentStep].component

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors",
              i < currentStep ? "bg-primary text-primary-foreground" :
              i === currentStep ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
              "bg-muted text-muted-foreground"
            )}>
              {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-16 h-0.5 mx-2",
                i < currentStep ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center">
        <h2 className="text-xl font-heading font-semibold">{steps[currentStep].title}</h2>
        {steps[currentStep].description && (
          <p className="text-sm text-muted-foreground mt-1">{steps[currentStep].description}</p>
        )}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <StepComponent onNext={handleNext} data={formData} />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Back Button */}
      {currentStep > 0 && (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={handleBack}>Back</Button>
        </div>
      )}
    </div>
  )
}
```

## Step Component Pattern
```typescript
function StepOne({ onNext, data }: { onNext: (d: any) => void; data: any }) {
  const form = useForm({ defaultValues: data })

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
      {/* Fields */}
      <Button type="submit">Continue</Button>
    </form>
  )
}
```
