# PATTERN: Stripe Payments
# Use for: Checkout, subscriptions, customer portal, webhooks.
# Apply in: When PROJECT-SPEC includes payment features

## Setup
```bash
npm install stripe @stripe/stripe-js
```

## Server-Side Stripe Client
```typescript
// src/lib/stripe.ts
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})
```

## Checkout Session
```typescript
// src/lib/actions/billing.ts
"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function createCheckoutSession(priceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription", // or "payment" for one-time
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
    metadata: { userId: user.id },
  })

  return { success: true, data: { url: session.url } }
}
```

## Webhook Handler
```typescript
// src/app/api/webhooks/stripe/route.ts
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get("stripe-signature")!

  const event = stripe.webhooks.constructEvent(
    body, signature, process.env.STRIPE_WEBHOOK_SECRET!
  )

  switch (event.type) {
    case "checkout.session.completed":
      // Activate subscription
      break
    case "customer.subscription.updated":
      // Update subscription status
      break
    case "customer.subscription.deleted":
      // Deactivate subscription
      break
    case "invoice.payment_failed":
      // Handle failed payment
      break
  }

  return new Response("OK", { status: 200 })
}
```

## Customer Portal
```typescript
export async function createPortalSession() {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })
  return { success: true, data: { url: session.url } }
}
```
