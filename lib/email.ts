import { Resend } from "resend";
import { marked } from "marked";
import { db } from "@/lib/db";
import { orgMembers } from "@/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Convert markdown to HTML with GitHub-flavored styling
 */
function markdownToHtml(markdown: string): string {
  // Configure marked for GitHub-flavored markdown
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const rawHtml = marked.parse(markdown) as string;

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
      line-height: 1.6;
      color: #24292e;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    h1 {
      color: #0366d6;
      border-bottom: 2px solid #0366d6;
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      color: #0366d6;
      border-bottom: 1px solid #e1e4e8;
      padding-bottom: 8px;
      margin-top: 32px;
    }
    h3 {
      color: #24292e;
      margin-top: 24px;
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
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    ul, ol {
      padding-left: 2em;
    }
    li {
      margin-bottom: 4px;
    }
    blockquote {
      border-left: 4px solid #dfe2e5;
      padding-left: 16px;
      color: #6a737d;
      margin-left: 0;
    }
    hr {
      border: 0;
      border-top: 1px solid #e1e4e8;
      margin: 24px 0;
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
      margin: 16px 0;
    }
    table th,
    table td {
      border: 1px solid #dfe2e5;
      padding: 8px 12px;
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
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e1e4e8;
      color: #6a737d;
      font-size: 14px;
    }
  </style>
</head>
<body>
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
 * @returns Resend response with email ID
 */
export async function sendDailySummary(
  recipients: string[] | string,
  subject: string,
  markdown: string,
  summaryDate?: Date
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

    // Convert markdown to HTML
    const html = markdownToHtml(enhancedMarkdown);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toAddresses,
      subject,
      html,
    });

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
 * Get recipients from database (all org members with email addresses)
 * Falls back to environment variable if database query fails or returns no results
 */
export async function getRecipients(org: string): Promise<string[]> {
  try {
    // Get all org members with email addresses
    const members = await db
      .select({ email: orgMembers.email })
      .from(orgMembers)
      .where(
        eq(orgMembers.org, org)
      );

    // Filter out null/undefined emails
    const emails = members
      .map((m) => m.email)
      .filter((email): email is string => !!email && email.trim().length > 0);

    if (emails.length > 0) {
      console.log(`Found ${emails.length} recipients from database for org ${org}`);
      return emails;
    }

    // Fallback to environment variable
    console.warn(`No emails found in database for org ${org}, falling back to ACTIVITY_SUMMARY_RECIPIENTS`);
    const recipientsEnv = process.env.ACTIVITY_SUMMARY_RECIPIENTS;
    if (!recipientsEnv) {
      console.warn('ACTIVITY_SUMMARY_RECIPIENTS environment variable is not set');
      return [];
    }

    return recipientsEnv.split(',').map((email) => email.trim()).filter(Boolean);
  } catch (error) {
    console.error('Failed to get recipients from database:', error);

    // Fallback to environment variable
    const recipientsEnv = process.env.ACTIVITY_SUMMARY_RECIPIENTS;
    if (!recipientsEnv) {
      return [];
    }

    return recipientsEnv.split(',').map((email) => email.trim()).filter(Boolean);
  }
}
