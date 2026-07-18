import { sendN8nEmail } from "./N8nMailer.js";

export const EmailClient = async (email, name) => {
  return sendN8nEmail('welcome', {
    to: email,
    subject: "Welcome to ProConnect",
    name,
  });
};
