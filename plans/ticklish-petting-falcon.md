# Implementation Plan: Integrate n8n Webhook for Login Alerts

## Context
The user wants to use a specifically defined n8n webhook URL (`N8N_LOGIN_ALERT_WEBHOOK_URL`) from their `.env` file to trigger login alerts, instead of (or in addition to) the current email-based alert system.

## Proposed Changes
1. Update `Server/Controllers/AuthController.js` to also trigger the n8n webhook when a successful login occurs (within `sendLoginAlert`).
2. Add a helper function similar to `sendBookingRequestWebhook` in `Server/Controllers/BookingController.js` (but likely in `Server/utils/LoginAlertAutomation.js` or a new utility), to dispatch the alert payload to the n8n webhook defined in `process.env`.
3. Call this new webhook-dispatch function inside `sendLoginAlert` in `AuthController.js`.

## Critical Files
- `Server/Controllers/AuthController.js`
- `Server/utils/LoginAlertAutomation.js`

## Verification
- Perform a successful login.
- Check if the notification is received via the n8n webhook URL.
