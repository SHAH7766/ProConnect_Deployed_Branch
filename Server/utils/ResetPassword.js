import { sendN8nEmail } from "./N8nMailer.js";

export const resetpassword = async (email, resetLink, details = {}) => {
  const { name = "Account holder" } = details;

  return sendN8nEmail('reset_password', {
    username: name,
    email,
    resetLink,
  }, 'N8N_RESET_EMAIL_WEBHOOK_URL');
};
