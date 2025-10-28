/**
 * Microsoft Teams webhook integration
 * Sends activity summaries to Teams channels
 */

export interface TeamsAdaptiveCard {
  type: "AdaptiveCard";
  version: "1.4";
  msteams?: {
    width?: "Full";
    entities?: Array<{
      type: "mention";
      text: string;
      mentioned: {
        id: string;
        name: string;
      };
    }>;
  };
  body: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}

export interface TeamsMessagePayload {
  attachments: Array<{
    contentType: "application/vnd.microsoft.card.adaptive";
    content: TeamsAdaptiveCard;
  }>;
}

/**
 * Convert markdown to Adaptive Card with TextBlock and user mentions
 * Displays the full AI-generated summary
 */
function convertMarkdownToAdaptiveCard(markdown: string, summaryDate: Date): TeamsAdaptiveCard {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'https://gh-arch-viz.vercel.app';
  const dateStr = summaryDate.toISOString().split('T')[0];
  const webUrl = `${baseUrl}/activity/${dateStr}`;

  // Parse mention users from env
  const mentionUsers = process.env.TEAMS_MENTION_USERS?.split(',').map(u => u.trim()).filter(Boolean) || [];

  // Build mention entities for msteams
  const entities = mentionUsers.map((upn, index) => ({
    type: "mention",
    text: `<at>user${index}</at>`,
    mentioned: {
      id: upn,
      name: upn.split('@')[0], // Use part before @ as display name
    },
  }));

  // Build mention text (shown at top of card)
  const mentionText = mentionUsers.length > 0
    ? mentionUsers.map((_, index) => `<at>user${index}</at>`).join(' ') + '\n\n'
    : '';

  return {
    type: "AdaptiveCard",
    version: "1.4",
    msteams: {
      width: "Full",
      entities: entities.length > 0 ? entities : undefined,
    },
    body: [
      {
        type: "TextBlock",
        text: mentionText + markdown,
        wrap: true,
      },
      {
        type: "ActionSet",
        actions: [
          {
            type: "Action.OpenUrl",
            title: "📖 Webで全文を読む",
            url: webUrl,
          },
        ],
      },
    ],
  };
}

/**
 * Send daily activity summary to Teams channel
 * Uses the same AI-generated markdown as email
 */
export async function sendToTeams(
  markdown: string,
  org: string,
  summaryDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('TEAMS_WEBHOOK_URL not configured, skipping Teams notification');
      return { success: false, error: 'TEAMS_WEBHOOK_URL not configured' };
    }

    // Convert markdown to Adaptive Card
    const adaptiveCard = convertMarkdownToAdaptiveCard(markdown, summaryDate);

    // Build payload
    const payload: TeamsMessagePayload = {
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: adaptiveCard,
        },
      ],
    };

    // Send to Teams webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send to Teams webhook:', response.status, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    console.log('Successfully sent activity summary to Teams');
    return { success: true };
  } catch (error) {
    console.error('Failed to send to Teams:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
