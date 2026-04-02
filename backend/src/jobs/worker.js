const { Worker } = require('bullmq');
const { prisma } = require('../lib/prisma');
const { sendEmail } = require('../lib/email');
const { sendNotification, NOTIFICATION_TYPES } = require('../lib/notifications');
const fs = require('fs');
const { parse } = require('csv-parse');

let worker = null;

/**
 * Initialise the BullMQ worker.
 * Wrapped in try/catch so the API boots even if Redis is unavailable.
 */
function startWorker(redisConnection) {
  try {
    worker = new Worker('crm-tasks', async (job) => {
      const taskType = job.data?.type || job.name;
      console.log(`[Worker] Processing job ${job.id} (${taskType})`);

      switch (taskType) {
        case 'reminder-email':
          await handleReminderEmail(job.data.data || job.data);
          break;
        case 'reminder-chat':
          await handleReminderChat(job.data.data || job.data);
          break;
        case 'csv-import':
          await handleCsvImport(job.data.data || job.data);
          break;
        case 'cron-tick':
          const { processReminders } = require('./cron');
          await processReminders();
          break;
        default:
          console.warn(`[Worker] Unknown job type: ${taskType}`);
      }
    }, { connection: redisConnection });

    worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completed`));
    worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err.message));
    worker.on('error', (err) => console.error('[Worker] Worker error:', err.message));

    console.log('[Worker] BullMQ worker started');
  } catch (err) {
    console.error('[Worker] Failed to start BullMQ worker (Redis unavailable?):', err.message);
    worker = null;
  }
  return worker;
}

/**
 * Handle Reminder Email
 */
async function handleReminderEmail(data) {
  const { reminderId } = data;
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: {
      user: { select: { id: true, email: true, name: true, emailVerified: true, emailPreference: true } },
      company: { select: { name: true } },
    },
  });

  if (!reminder || reminder.status === 'sent') return;

  const companyName = reminder.company?.name || 'your contact';

  // Send in-app notification (primary)
  await sendNotification(
    reminder.user.id,
    reminder.tenantId,
    'REMINDER_DUE',
    {
      title: companyName,
      message: companyName,
    },
    {
      relatedEntity: 'reminder',
      relatedEntityId: reminderId,
    }
  );

  // Optional: Still send email if user preference allows
  const emailPreference = reminder.user?.emailPreference || 'send';
  if (emailPreference !== 'none') {
    try {
      const targetEmail = (emailPreference === 'forward' || !reminder.user?.emailVerified)
        ? process.env.FORWARD_EMAIL || reminder.user.email
        : reminder.user.email;

      await sendEmail({
        to: targetEmail,
        subject: `⏰ CRM Reminder: ${companyName}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px">
            <h2>🔔 Reminder</h2>
            <p>Hi <strong>${reminder.user.name}</strong>,</p>
            <p>You have a reminder for <strong>${companyName}</strong>:</p>
            <blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #10b981;">
              ${reminder.message}
            </blockquote>
            <p style="color:#6b7280;font-size:12px;">Due: ${new Date(reminder.dueDate).toLocaleString()}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="font-size:12px;color:#9ca3af;">Nexus CRM — Automated Reminder</p>
          </div>
        `,
      });
      console.log(`[Worker] Reminder email sent for ${reminderId}`);
    } catch (emailErr) {
      console.warn(`[Worker] Email send failed (notification already sent):`, emailErr.message);
    }
  }

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: 'sent' },
  });
  console.log(`[Worker] Reminder notification sent for ${reminderId}`);
}

/**
 * Handle Reminder Chat Bot Notification
 */
async function handleReminderChat(data) {
  const { activityId } = data;
  const r = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      tenant: { include: { users: { orderBy: { createdAt: 'asc' }, take: 1 } } },
      company: true,
    },
  });

  if (!r || !r.tenant?.users?.[0]) return;
  const targetUser = r.tenant.users[0];

  let bot = await prisma.user.findFirst({ where: { tenantId: r.tenantId, name: 'System Reminders' } });
  if (!bot) {
    bot = await prisma.user.create({
      data: { tenantId: r.tenantId, name: 'System Reminders', email: `bot_${r.tenantId}@system.local` },
    });
  }

  let conv = await prisma.conversation.findFirst({
    where: {
      tenantId: r.tenantId,
      OR: [
        { userAId: targetUser.id, userBId: bot.id },
        { userAId: bot.id, userBId: targetUser.id },
      ],
    },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { tenantId: r.tenantId, userAId: targetUser.id, userBId: bot.id },
    });
  }

  const parts = [`🔔 **REMINDER ALERT**`, `Scheduled reminder triggered.`];
  if (r.company) parts.push(`👤 Company: ${r.company.name}`);
  if (r.notes) parts.push(`📝 Notes: ${r.notes}`);

  await prisma.message.create({
    data: {
      tenantId: r.tenantId,
      conversationId: conv.id,
      senderId: bot.id,
      body: parts.join('\n'),
    },
  });
}

/**
 * Handle Large CSV Import (10,000+ rows)
 */
async function handleCsvImport(data) {
  const { filePath, tenantId } = data;
  if (!fs.existsSync(filePath)) throw new Error('CSV file not found: ' + filePath);

  const BATCH = 500;
  let batch = [];
  let total = 0;

  const flush = async () => {
    if (!batch.length) return;
    await prisma.company.createMany({ data: batch, skipDuplicates: true });
    total += batch.length;
    console.log(`[Worker] CSV batch committed: ${total} rows so far`);
    batch = [];
  };

  const stream = fs.createReadStream(filePath);
  const parser = stream.pipe(parse({ columns: true, skip_empty_lines: true, trim: true, bom: true }));

  for await (const row of parser) {
    batch.push({
      tenantId,
      name: row.name || row.Name || 'Unknown',
      phone: row.phone || row.Phone || null,
      email: row.email || row.Email || null,
      status: row.status || row.Status || 'Active',
    });
    if (batch.length >= BATCH) await flush();
  }

  await flush();
  try { fs.unlinkSync(filePath); } catch {}
  console.log(`[Worker] CSV Import complete: ${total} rows for tenant ${tenantId}`);
}

module.exports = { 
  startWorker, 
  worker: () => worker,
  handleReminderEmail,
  handleReminderChat,
  handleCsvImport
};
