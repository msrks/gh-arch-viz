import { Resend } from "resend";
import { marked } from "marked";
import { db } from "@/lib/db";
import { emailRecipients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Convert markdown to HTML with GitHub-flavored styling
 * @param markdown - Markdown content
 * @param infographicDataUri - Optional base64 data URI for infographic image
 */
function markdownToHtml(markdown: string, infographicDataUri?: string): string {
  // Configure marked for GitHub-flavored markdown
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const rawHtml = marked.parse(markdown) as string;

  // Add infographic image at the top if provided
  const infographicHtml = infographicDataUri
    ? `
  <div style="margin-bottom: 32px; text-align: center;">
    <img src="${infographicDataUri}" alt="Activity Infographic" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
  </div>
    `
    : '';

  // Wrap in styled HTML template
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Activity Summary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #24292e;
      max-width: 900px;
      margin: 0 auto;
      padding: 16px;
      background-color: #ffffff;
      font-size: 13px;
    }
    h1 {
      color: #0366d6;
      border-bottom: 2px solid #0366d6;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 13px;
      font-weight: 600;
    }
    h2 {
      color: #0366d6;
      border-bottom: 1px solid #e1e4e8;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    h3 {
      color: #24292e;
      margin-top: 16px;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code {
      background-color: #f6f8fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
    }
    pre {
      background-color: #f6f8fa;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    ul, ol {
      padding-left: 1.5em;
      margin: 8px 0;
    }
    li {
      margin-bottom: 2px;
    }
    p {
      margin: 8px 0;
    }
    blockquote {
      border-left: 3px solid #dfe2e5;
      padding-left: 12px;
      color: #6a737d;
      margin: 8px 0;
    }
    hr {
      border: 0;
      border-top: 1px solid #e1e4e8;
      margin: 16px 0;
    }
    strong {
      font-weight: 600;
    }
    em {
      font-style: italic;
      color: #6a737d;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
      font-size: 12px;
    }
    table th,
    table td {
      border: 1px solid #dfe2e5;
      padding: 6px 8px;
      text-align: left;
    }
    table th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    table tr:nth-child(even) {
      background-color: #f6f8fa;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e1e4e8;
      color: #6a737d;
      font-size: 11px;
    }
  </style>
</head>
<body>
  ${infographicHtml}
  ${rawHtml}
  <div class="footer">
    <p>This is an automated email sent by gh-arch-viz. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send daily activity summary email
 * @param recipients - Array of email addresses or comma-separated string
 * @param subject - Email subject
 * @param markdown - Markdown content
 * @param summaryDate - Date of the summary (for web link)
 * @param infographic - Optional infographic image data
 * @returns Resend response with email ID
 */
export async function sendDailySummary(
  recipients: string[] | string,
  subject: string,
  markdown: string,
  summaryDate?: Date,
  infographic?: { imageData: Uint8Array; mediaType: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Parse recipients
    const toAddresses = Array.isArray(recipients)
      ? recipients
      : recipients.split(',').map((email) => email.trim());

    if (toAddresses.length === 0) {
      throw new Error('No recipients specified');
    }

    // Get sender email from environment
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error('RESEND_FROM_EMAIL environment variable is not set');
    }

    // Add web link if summary date is provided
    let enhancedMarkdown = markdown;
    if (summaryDate) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'https://gh-arch-viz.vercel.app';
      const dateStr = summaryDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const webUrl = `${baseUrl}/activity/${dateStr}`;

      enhancedMarkdown = `${markdown}\n\n---\n\n📖 **[Webで全文を読む](${webUrl})**`;
    }

    // Convert infographic to base64 data URI if provided
    let infographicDataUri: string | undefined;
    if (infographic) {
      const base64Data = Buffer.from(infographic.imageData).toString('base64');
      infographicDataUri = `data:${infographic.mediaType};base64,${base64Data}`;
    }

    // Convert markdown to HTML (include infographic data URI if provided)
    const html = markdownToHtml(enhancedMarkdown, infographicDataUri);

    // Prepare email payload
    const emailPayload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
    } = {
      from: fromEmail,
      to: toAddresses,
      subject,
      html,
    };

    // Send email using Resend
    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('Failed to send email via Resend:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }

    console.log(`Email sent successfully via Resend. ID: ${data?.id}`);
    return {
      success: true,
      id: data?.id,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get active email recipients from database
 * Falls back to environment variable if no recipients found
 */
export async function getRecipients(org: string): Promise<string[]> {
  try {
    // Get all active email recipients from database
    const recipients = await db
      .select({ email: emailRecipients.email })
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.org, org),
          eq(emailRecipients.active, true)
        )
      );

    const dbEmails = recipients
      .map((r) => r.email)
      .filter((email) => email && email.trim().length > 0);

    if (dbEmails.length > 0) {
      console.log(`Found ${dbEmails.length} active recipients from database for org ${org}`);
      return dbEmails;
    }

    // Fallback to environment variable if no recipients in database
    console.warn(`No active recipients found in database for org ${org}, falling back to ACTIVITY_SUMMARY_RECIPIENTS`);
    const recipientsEnv = process.env.ACTIVITY_SUMMARY_RECIPIENTS;
    if (recipientsEnv) {
      const envEmails = recipientsEnv.split(',').map((email) => email.trim()).filter(Boolean);
      console.log(`Using ${envEmails.length} recipients from environment variable`);
      return envEmails;
    }

    console.warn('No recipients configured');
    return [];
  } catch (error) {
    console.error('Failed to get recipients from database:', error);

    // Fallback to environment variable on error
    const recipientsEnv = process.env.ACTIVITY_SUMMARY_RECIPIENTS;
    if (recipientsEnv) {
      return recipientsEnv.split(',').map((email) => email.trim()).filter(Boolean);
    }

    return [];
  }
}
