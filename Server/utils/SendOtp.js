import { sendN8nEmail } from "./N8nMailer.js";

export const sendOtpEmail = async (email, otp) => {
  return sendN8nEmail('otp', {
    to: email,
    subject: `Your Verification Code: ${otp}`,
    otp,
  });
};
