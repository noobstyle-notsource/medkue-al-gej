const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend
 * src/lib/email.js
 */
async function sendEmail({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Default Resend testing address
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    throw error;
  }
}

module.exports = { sendEmail };
