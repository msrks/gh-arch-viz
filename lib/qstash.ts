import { Client } from "@upstash/qstash";

/**
 * Upstash QStash client for background job processing
 */
if (!process.env.QSTASH_TOKEN) {
  throw new Error("QSTASH_TOKEN environment variable is not set");
}

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
});
