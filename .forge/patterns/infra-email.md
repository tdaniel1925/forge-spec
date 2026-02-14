# PATTERN: Transactional Email (Resend)
# Use for: Welcome emails, password reset, notifications, invoices.

## Setup
```bash
npm install resend
```

```typescript
// src/lib/email.ts
import { Resend } from "resend"
export const resend = new Resend(process.env.RESEND_API_KEY)
```

```typescript
// Usage in server actions
import { resend } from "@/lib/email"

await resend.emails.send({
  from: "App Name <noreply@yourdomain.com>",
  to: [user.email],
  subject: "Welcome to App Name",
  html: `<h1>Welcome, ${user.name}!</h1><p>Get started by...</p>`,
})
```

For complex templates, use React Email: `npm install @react-email/components`
