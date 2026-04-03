const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend
 * src/lib/email.js
 */
async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'change-me') {
    console.log('[Email] Resend not configured. Skipping email to:', to);
    return { skipped: true };
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject,
      html,
    });
    
    if (error) {
      console.warn('[Email] Resend error (ignoring):', error);
      return null;
    }
    return data;
  } catch (error) {
    console.warn('[Email] Failed to send email (ignoring):', error.message);
    return null;
  }
}

module.exports = { sendEmail };
