import { sendN8nEmail } from "./N8nMailer.js";

export const sendBookingNotification = async (providerEmail, bookingDetails) => {
  return sendN8nEmail('booking_request', {
    to: providerEmail,
    subject: `New ${bookingDetails.serviceCategory} request on ProConnect`,
    recipientRole: 'provider',
    ...bookingDetails,
  });
};

export const sendCustomerBookingNotification = async (customerEmail, bookingDetails) => {
  if (!customerEmail) return null;
  return sendN8nEmail('booking_confirmation', {
    to: customerEmail,
    subject: `Booking requested for ${bookingDetails.serviceCategory}`,
    recipientRole: 'customer',
    ...bookingDetails,
  });
};

export const sendPaymentReceivedNotification = async (providerEmail, bookingDetails) => {
  if (!providerEmail) return null;
  return sendN8nEmail('payment_received', {
    to: providerEmail,
    subject: `Payment received for ${bookingDetails.serviceCategory}`,
    recipientRole: 'provider',
    ...bookingDetails,
  });
};

export const sendWorkCompletedNotification = async (customerEmail, bookingDetails) => {
  if (!customerEmail) return null;
  return sendN8nEmail('work_completed', {
    to: customerEmail,
    subject: `Work Completed: ${bookingDetails.serviceCategory}`,
    recipientRole: 'customer',
    ...bookingDetails,
  });
};

export const sendBookingAcceptedNotification = async (customerEmail, providerEmail, bookingDetails) => {
  const promises = [];

  if (customerEmail) {
    promises.push(
      sendN8nEmail('booking_accepted', {
        to: customerEmail,
        subject: `Booking Accepted: ${bookingDetails.serviceCategory}`,
        recipientRole: 'customer',
        ...bookingDetails,
      })
    );
  }

  if (providerEmail) {
    promises.push(
      sendN8nEmail('booking_accepted', {
        to: providerEmail,
        subject: `Booking Confirmed: ${bookingDetails.serviceCategory}`,
        recipientRole: 'provider',
        ...bookingDetails,
      })
    );
  }

  const results = await Promise.all(promises);
  console.log("Booking accepted notifications sent via N8N:", promises.length);
  return results;
};
