/**
 * Email Automation Utilities
 * Stage 6 — Automation (Layer 5)
 *
 * Sends transactional emails via Resend API.
 * All emails are tied to automation rules from Gate 4.
 */

import type { EmailPayload, EmailResult } from '@/types/automation';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'ForgeSpec <noreply@forgespec.ai>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://forgespec.ai';
const FORGEBOARD_URL = process.env.FORGEBOARD_URL || 'https://forgeboard.ai';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'daniel@botmakers.ai';

/**
 * Send email via Resend API
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: payload.from || FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Email] Resend API error:', errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('[Email] Exception sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Rule #1: Welcome email template
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<EmailResult> {
  const displayName = name || 'there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #171717; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 600; color: #FF7F50; }
    .content { background: #fafafa; border-radius: 16px; padding: 32px; }
    h1 { font-size: 28px; margin: 0 0 16px 0; color: #171717; }
    p { margin: 0 0 16px 0; color: #525252; }
    .cta { display: inline-block; background: linear-gradient(135deg, #FF7F50 0%, #FF6347 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 16px 0; }
    .footer { text-align: center; margin-top: 32px; font-size: 14px; color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ForgeSpec</div>
    </div>
    <div class="content">
      <h1>Welcome to ForgeSpec, ${displayName}!</h1>
      <p>You're all set to turn any app idea into a production-ready specification.</p>
      <p>Here's what you can do with ForgeSpec:</p>
      <ul>
        <li><strong>Deep Research</strong> — We analyze competitors and user pain points</li>
        <li><strong>Granular Decomposition</strong> — Break every feature into atomic components</li>
        <li><strong>Production-Ready Specs</strong> — Download a complete .forge zip for Claude Code</li>
      </ul>
      <p>Ready to create your first spec?</p>
      <a href="${APP_URL}/spec/new" class="cta">Create Your First Spec →</a>
    </div>
    <div class="footer">
      <p>Built with ❤️ by BotMakers</p>
      <p><a href="${APP_URL}" style="color: #a3a3a3;">forgespec.ai</a></p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to ForgeSpec! Create your first spec →',
    html,
  });
}

/**
 * Rule #6: Admin notification for waitlist entry
 */
export async function sendAdminWaitlistNotification(
  userEmail: string,
  specName?: string
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #171717; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    h2 { margin: 0 0 8px 0; color: #92400e; font-size: 18px; }
    p { margin: 0 0 8px 0; color: #525252; }
    .details { background: #fafafa; padding: 16px; border-radius: 8px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h2>🔔 New ForgeBoard Interest</h2>
      <p><strong>User:</strong> ${userEmail}</p>
      ${specName ? `<p><strong>Spec:</strong> ${specName}</p>` : ''}
    </div>
    <div class="details">
      <p>A user has clicked "Build This For Me" and expressed interest in having ForgeBoard build their app.</p>
      <p><strong>Next steps:</strong></p>
      <ul>
        <li>Review the user's spec project</li>
        <li>Reach out with pricing and timeline</li>
        <li>Add to ForgeBoard sales pipeline</li>
      </ul>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `🔔 New ForgeBoard interest: ${userEmail}`,
    html,
  });
}

/**
 * Rule #8: Nudge email for inactive users (7 days after signup, no specs created)
 */
export async function sendNudgeEmail(
  email: string,
  name?: string
): Promise<EmailResult> {
  const displayName = name || 'there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #171717; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fafafa; border-radius: 16px; padding: 32px; }
    h1 { font-size: 24px; margin: 0 0 16px 0; }
    p { margin: 0 0 16px 0; color: #525252; }
    .cta { display: inline-block; background: linear-gradient(135deg, #FF7F50 0%, #FF6347 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>Ready to build your first spec, ${displayName}?</h1>
      <p>You signed up for ForgeSpec a week ago, and we'd love to help you turn your app idea into a production-ready specification.</p>
      <p>Creating a spec takes just a few minutes:</p>
      <ul>
        <li>Describe your app idea</li>
        <li>We research the domain and competitors</li>
        <li>You get a complete spec ready for Claude Code</li>
      </ul>
      <a href="${APP_URL}/spec/new" class="cta">Create Your First Spec →</a>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Ready to build your first spec?',
    html,
  });
}

/**
 * Rule #9: Reminder email for completed but not downloaded specs (3 days after completion)
 */
export async function sendReminderEmail(
  email: string,
  specName: string,
  specId: string
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #171717; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fafafa; border-radius: 16px; padding: 32px; }
    h1 { font-size: 24px; margin: 0 0 16px 0; }
    p { margin: 0 0 16px 0; color: #525252; }
    .cta { display: inline-block; background: linear-gradient(135deg, #FF7F50 0%, #FF6347 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>Your spec is ready to download!</h1>
      <p>Your spec for <strong>${specName}</strong> is ready and waiting for you.</p>
      <p>Download the .forge zip and open it with Claude Code to start building your app.</p>
      <a href="${APP_URL}/spec/${specId}" class="cta">Download Your Spec →</a>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `Your spec for ${specName} is ready to download!`,
    html,
  });
}

/**
 * Rule #10: Upsell email for downloaded specs (7 days after download)
 */
export async function sendUpsellEmail(
  email: string,
  specName: string
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #171717; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fafafa; border-radius: 16px; padding: 32px; }
    h1 { font-size: 24px; margin: 0 0 16px 0; }
    p { margin: 0 0 16px 0; color: #525252; }
    .cta { display: inline-block; background: linear-gradient(135deg, #FF7F50 0%, #FF6347 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 16px 0; }
    .secondary-cta { display: inline-block; background: transparent; color: #FF7F50; text-decoration: none; padding: 12px 24px; border: 1px solid #FF7F50; border-radius: 8px; font-weight: 500; margin: 16px 8px 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>How's the build going?</h1>
      <p>You downloaded the spec for <strong>${specName}</strong> last week. We hope the build is going well!</p>
      <p>If you'd rather have the experts handle it, ForgeBoard can build your app in ~30 minutes with full Claude Code automation.</p>
      <ul>
        <li>Production-ready Next.js app</li>
        <li>Deployed to Vercel with Supabase backend</li>
        <li>Fully tested and documented</li>
      </ul>
      <a href="${FORGEBOARD_URL}/pricing" class="cta">See ForgeBoard Pricing →</a>
      <a href="${FORGEBOARD_URL}" class="secondary-cta">Learn More</a>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `How's the build going? Let ForgeBoard handle it for you`,
    html,
  });
}
