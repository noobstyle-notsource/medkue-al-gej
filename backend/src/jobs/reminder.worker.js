const { Redis } = require('@upstash/redis');
const { Resend } = require('resend');

const { prisma } = require('../lib/prisma');

// Upstash Redis client
const redis = new Redis({
  url: 'https://main-snipe-86234.upstash.io',
  token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple reminder queue
class SimpleReminderQueue {
  async add(name, data, options = {}) {
    const { delay = 0 } = options;
    const executeAt = Date.now() + delay;

    const reminderData = {
      id: `${Date.now()}-${Math.random()}`,
      name,
      data,
      executeAt,
      attempts: 0
    };

    // Use simple list instead of sorted set for Upstash compatibility
    await redis.lpush('reminder-queue', JSON.stringify(reminderData));

    console.log(`[Reminder] Scheduled reminder ${data.reminderId} for ${new Date(executeAt).toISOString()}`);
  }
}

const reminderQueue = new SimpleReminderQueue();

// Process reminders every 30 seconds
async function processReminders() {
  try {
    // Get all reminders from queue
    const queueLength = await redis.llen('reminder-queue');
    if (queueLength === 0) return;

    const reminders = await redis.lrange('reminder-queue', 0, -1);
    console.log(`[Reminder] Processing ${reminders.length} reminders from queue`);

    const now = Date.now();
    const toRetry = [];

    for (const reminderJson of reminders) {
      // Validate and parse JSON safely
      let reminder;
      try {
        reminder = JSON.parse(reminderJson);
      } catch (error) {
        console.error('[Reminder] Invalid JSON in queue, skipping:', reminderJson);
        continue; // Skip this corrupted item
      }

      // Check if it's time to execute
      if (reminder.executeAt <= now) {
        try {
          // Create proper job object structure
          const job = { data: reminder.data };
          await processReminderJob(job);
        } catch (error) {
          console.error(`[Reminder] Failed to process reminder ${reminder.data?.reminderId}:`, error.message);

          // Retry logic (max 3 attempts)
          if (reminder.attempts < 3) {
            reminder.attempts++;
            reminder.executeAt = Date.now() + (5000 * Math.pow(2, reminder.attempts)); // Exponential backoff
            toRetry.push(JSON.stringify(reminder));
            console.log(`[Reminder] Retrying reminder ${reminder.data?.reminderId} in ${reminder.executeAt - Date.now()}ms`);
          } else {
            console.error(`[Reminder] Giving up on reminder ${reminder.data?.reminderId} after 3 attempts`);
          }
        }
      } else {
        // Not time yet, put back in queue
        toRetry.push(reminderJson);
      }
    }

    // Clear queue and re-add pending/retry items
    await redis.del('reminder-queue');
    if (toRetry.length > 0) {
      await redis.lpush('reminder-queue', ...toRetry);
    }

    let queueErrorLogged = false;
  } catch (error) {
    if (!queueErrorLogged) {
      console.log('[Reminder] Redis queue offline — running without background jobs.');
      queueErrorLogged = true;
    }
  }
} // processReminders end

async function processReminderJob(job) {
  const { reminderId } = job.data || {};
  if (!reminderId) return;

  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: {
      user: { select: { email: true, name: true, emailVerified: true, emailPreference: true } },
      contact: { select: { name: true } },
    },
  });

  if (!reminder || reminder.status === 'sent') return;

  // Check user's email preference
  const emailPreference = reminder.user.emailPreference || 'send';

  switch (emailPreference) {
    case 'none':
      console.log(`[Reminder] User opted out of emails - skipping reminder ${reminderId}`);
      return; // Don't send email, but mark as processed

    case 'forward':
      // Forward to verified address (for testing)
      var targetEmail = 'misheelmother@gmail.com';
      var isActualEmail = false;
      var forwardingNotice = `
        <div style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b;margin-top:15px;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            📧 <strong>Forwarded Email:</strong> This reminder was originally for <strong>${reminder.user.email}</strong> 
            but forwarded to your verified address due to Resend testing limitations.
          </p>
        </div>`;
      break;

    case 'send':
    default:
      // Send directly to user (if verified) or forward
      var targetEmail = reminder.user.emailVerified ?
        reminder.user.email :
        'misheelmother@gmail.com';
      var isActualEmail = targetEmail === reminder.user.email;
      var forwardingNotice = !isActualEmail ? `
        <div style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b;margin-top:15px;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            📧 <strong>Forwarded Email:</strong> This reminder was originally for <strong>${reminder.user.email}</strong> 
            but forwarded to your verified address due to Resend testing limitations.
          </p>
        </div>` : '';
      break;
  }

  const isVerified = reminder.user.emailVerified;

  // Send real email using Resend
  const { error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: targetEmail,
    subject: `⏰ Reminder: ${reminder.contact.name}${!isActualEmail ? ' (Forwarded)' : ''}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2>Reminder</h2>
        <p>Hi <strong>${reminder.user.name}</strong>,</p>
        <p>You have a scheduled reminder for <strong>${reminder.contact.name}</strong>:</p>
        <blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #10b981;">
          ${reminder.message}
        </blockquote>
        <p>Due: <strong>${new Date(reminder.dueDate).toLocaleString()}</strong></p>
        
        ${forwardingNotice}
        
        ${!isVerified ? `
        <div style="background:#e0f2fe;padding:12px;border-radius:6px;border-left:4px solid #0ea5e9;margin-top:15px;">
          <p style="margin:0;color:#075985;font-size:13px;">
            🔔 <strong>Email Verification:</strong> ${reminder.user.email} is not verified. 
            In production, users should verify their email for reliable delivery.
          </p>
        </div>
        ` : ''}
        
        ${emailPreference === 'none' ? `
        <div style="background:#f3f4f6;padding:12px;border-radius:6px;border-left:4px solid #ef4444;margin-top:15px;">
          <p style="margin:0;color:#991b1b;font-size:13px;">
            � <strong>Opted Out:</strong> You chose not to receive email notifications.
            This reminder is recorded but no email was sent per your preference.
          </p>
        </div>
        ` : ''}
        
        <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#6b7280;">
          Sent from Nexus CRM - Your Customer Relationship Management System<br>
          Email Preference: ${emailPreference}<br>
          ${!isVerified ? 'Email verification recommended' : 'Email verified ✅'}
          ${!isActualEmail ? 'Forwarded for testing' : ''}
        </p>
      </div>
    `,
  });

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: 'sent' },
  });
  console.log(`[Reminder] Marked reminder ${reminderId} as sent`);
}

// Start processing
console.log('[Reminder] Starting reminder queue processor...');
processReminders();

// Set up interval for processing
setInterval(processReminders, 30000); // Check every 30 seconds

// Export for external testing
module.exports = {
  processReminderJob,
  processReminders,
  reminderQueue
};
