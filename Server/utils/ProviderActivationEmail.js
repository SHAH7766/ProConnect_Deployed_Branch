import { sendN8nEmail } from "./N8nMailer.js";

export const sendProviderActivationEmail = async (provider) => {
  return sendN8nEmail('provider_activation', {
    to: provider.email,
    subject: "Your ProConnect Provider Account is Active!",
    name: provider.name,
    email: provider.email,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  });
};
