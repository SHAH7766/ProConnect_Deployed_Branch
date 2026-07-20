/**
 * Unified N8N email sender — replaces nodemailer entirely.
 * Sends email data to an N8N webhook, which handles delivery & templates.
 */

const DEFAULT_WEBHOOK_URL_KEY = 'N8N_EMAIL_WEBHOOK_URL';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const getWebhookUrl = (envKey) => {
  const url = process.env[envKey];
  if (!url) {
    console.error(`❌ ${envKey} is not set — cannot send email`);
  }
  return url;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send an email request to N8N with automatic retries.
 *
 * @param {string} type          — email type discriminator (e.g. 'otp', 'welcome', 'booking')
 * @param {object} data          — all dynamic fields the email needs (to, subject, name, dates, etc.)
 * @param {string} [webhookEnvKey] — optional env var name for a dedicated webhook URL;
 *                                   defaults to N8N_EMAIL_WEBHOOK_URL
 * @returns {Promise<Response|null>}
 */
export const sendN8nEmail = async (type, data = {}, webhookEnvKey = DEFAULT_WEBHOOK_URL_KEY) => {
  const webhookUrl = getWebhookUrl(webhookEnvKey);
  if (!webhookUrl) return null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data }),
      });

      if (!response.ok) {
        console.error(`N8N webhook responded with ${response.status} for type "${type}" (attempt ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      } else {
        console.log(`✅ N8N email triggered — type: ${type}`);
      }
      return response;
    } catch (error) {
      console.error(`N8N webhook error (${type}) attempt ${attempt}/${MAX_RETRIES}:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }
  return null;
};

/**
 * Convenience wrapper that matches the old sendMail() interface.
 * Passes the content alongside structured data so N8N can either
 * use its own templates or forward the provided HTML.
 *
 * @deprecated Use the type-specific senders instead.
 */
export const sendN8nMail = async ({ type = 'generic', to, subject, html, text, ...rest }) => {
  return sendN8nEmail(type, { to, subject, html, text, ...rest });
};
