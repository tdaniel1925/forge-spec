# ForgeSpec Setup Guide

This guide will walk you through setting up ForgeSpec locally and deploying to production.

---

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- An Anthropic API key (Claude)
- A Resend account (for email)
- Git installed

---

## 1. Clone the Repository

```bash
git clone https://github.com/tdaniel1925/forge-spec.git
cd forge-spec
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Set Up Supabase

### Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name:** ForgeSpec
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to you
4. Wait for project to be ready (~2 minutes)

### Get Your Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbG...`)
   - **Service Role Key** (starts with `eyJhbG...`) ⚠️ Keep this secret!

### Run Database Migrations

Install Supabase CLI:
```bash
npm install -g supabase
```

Link to your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
(Find your project ref in the Supabase URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`)

Push migrations:
```bash
supabase db push
```

This will create all 13 tables, RLS policies, and functions.

---

## 4. Get Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **Settings** → **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)
6. ⚠️ **Important:** Add credits to your account at [https://console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing)

**Cost Estimate:** Each spec generation costs ~$2.40 in API calls.

---

## 5. Get Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up (free tier: 100 emails/day)
3. Go to **API Keys**
4. Click **Create API Key**
5. Copy the key (starts with `re_`)

### Verify Your Domain (Optional but Recommended)

For production, verify your domain in Resend:
1. Go to **Domains** → **Add Domain**
2. Follow DNS verification steps
3. Use your domain email for `NOTIFICATION_EMAIL`

---

## 6. Configure Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-role-key

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Resend Email Service
RESEND_API_KEY=re_your-key-here

# Email Configuration
NOTIFICATION_EMAIL=your-email@example.com

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
FORGEBOARD_URL=https://forgeboard.ai

# Node Environment
NODE_ENV=development
```

---

## 7. Run Locally

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Test the Application

1. **Sign Up:** Go to `/signup` and create an account
2. **Create Spec:** Click "New Spec" and describe an app
3. **Watch Research:** AI will research competitors (takes 2-3 minutes)
4. **Generate Spec:** Review and download your .forge zip

---

## 8. Deploy to Production (Vercel)

### Connect to Vercel

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No
- **Project name?** forge-spec
- **Directory?** ./
- **Override settings?** No

### Add Environment Variables in Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: **forge-spec**
3. Go to **Settings** → **Environment Variables**
4. Add each variable from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `RESEND_API_KEY`
   - `NOTIFICATION_EMAIL`
   - `NEXT_PUBLIC_APP_URL` (use your Vercel domain, e.g., `https://forge-spec.vercel.app`)
   - `FORGEBOARD_URL`

5. Set environment for: **Production, Preview, and Development**

### Redeploy

```bash
vercel --prod
```

Your app will be live at: `https://forge-spec.vercel.app` (or your custom domain)

---

## 9. Set Up Cron Jobs (Optional)

For scheduled automations (daily analytics, email nudges), set up Vercel Cron:

### Create `vercel.json`

Already included in the project:
```json
{
  "crons": [
    {
      "path": "/api/automation/cron",
      "schedule": "0 3 * * *"
    }
  ]
}
```

This runs daily at 3am UTC.

### Enable Cron in Vercel

1. Go to **Project Settings** → **Cron Jobs**
2. Verify the cron job appears
3. It will auto-run on the schedule

---

## 10. Configure OAuth (Optional)

To enable Google OAuth sign-in:

### In Supabase

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add OAuth credentials:
   - **Client ID:** From Google Cloud Console
   - **Client Secret:** From Google Cloud Console
4. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### In Google Cloud Console

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a project or select existing
3. Go to **APIs & Services** → **Credentials**
4. **Create Credentials** → **OAuth 2.0 Client ID**
5. **Application type:** Web application
6. **Authorized redirect URIs:**
   - `https://your-project.supabase.co/auth/v1/callback`
7. Copy Client ID and Secret to Supabase

---

## 11. Monitoring & Logs

### Supabase Logs

- **Database:** [https://app.supabase.com/project/_/logs/postgres-logs](https://app.supabase.com/project/_/logs/postgres-logs)
- **Auth:** [https://app.supabase.com/project/_/logs/auth-logs](https://app.supabase.com/project/_/logs/auth-logs)

### Vercel Logs

- **Runtime Logs:** [https://vercel.com/dashboard/logs](https://vercel.com/dashboard/logs)
- **Function Logs:** Check per deployment

### Anthropic Usage

- **Dashboard:** [https://console.anthropic.com/dashboard](https://console.anthropic.com/dashboard)
- Monitor API costs and usage

---

## Troubleshooting

### "ANTHROPIC_API_KEY not found"
- Make sure `.env.local` exists and has the correct key
- Restart `npm run dev` after adding env vars

### Database connection errors
- Verify Supabase URL and keys are correct
- Check if migrations ran successfully: `supabase db push`

### Email not sending
- Verify Resend API key is valid
- Check if you're within free tier limits (100/day)
- Verify sender email in Resend dashboard

### OAuth redirect errors
- Ensure redirect URLs match exactly (including https/http)
- Check OAuth credentials in both Supabase and Google Console

---

## Support

- **Issues:** [https://github.com/tdaniel1925/forge-spec/issues](https://github.com/tdaniel1925/forge-spec/issues)
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **Anthropic Docs:** [https://docs.anthropic.com](https://docs.anthropic.com)
- **Vercel Docs:** [https://vercel.com/docs](https://vercel.com/docs)

---

## Next Steps

1. ✅ Set up custom domain in Vercel
2. ✅ Configure email templates in Resend
3. ✅ Enable Google Analytics (optional)
4. ✅ Set up monitoring (Sentry, LogRocket, etc.)
5. ✅ Configure CDN for .forge zip downloads
6. ✅ Add rate limiting at CDN level (Cloudflare)

---

**🎉 You're all set! ForgeSpec is ready to generate production-ready specs.**
