import { sendN8nEmail } from "./N8nMailer.js";

export const sendLoginAlertAutomation = async (email, details = {}) => {
  await sendN8nEmail('login_alert', {
    to: email,
    subject: 'New login to your ProConnect account',
    email,
    username: details.username,
    ...details,
  }, 'N8N_LOGIN_ALERT_WEBHOOK_URL');
};
