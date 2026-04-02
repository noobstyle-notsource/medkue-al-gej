const { Redis } = require('@upstash/redis');
const { Worker, Queue } = require('bullmq');
const { Resend } = require('resend');

const { prisma } = require('../lib/prisma');

// Upstash Redis client
const redis = new Redis({
  url: 'https://main-snipe-86234.upstash.io',
  token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Create a BullMQ connection adapter for Upstash
const connection = {
  name: 'bullmq',
  createClient: (type) => {
    switch (type) {
      case 'client':
        return redis;
      case 'subscriber':
      case 'bclient':
        // For BullMQ, we need to return a compatible client
        return redis;
      default:
        return redis;
    }
  },
};

// Queue export so controllers can enqueue reminders
const reminderQueue = new Queue('reminders', { connection });

// Worker — processes delayed reminder jobs
const worker = new Worker(
  'reminders',
  async (job) => {
    const { reminderId } = job.data || {};
    if (!reminderId) return;

    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        user: { select: { email: true, name: true } },
        contact: { select: { name: true } },
      },
    });

    if (!reminder || reminder.status === 'sent') return;

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'CRM SaaS <notifications@yourdomain.com>',
      to: reminder.user.email,
      subject: `⏰ Reminder: ${reminder.contact.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2>Reminder</h2>
          <p>Hi <strong>${reminder.user.name}</strong>,</p>
          <p>You have a scheduled reminder for <strong>${reminder.contact.name}</strong>:</p>
          <blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #10b981;">
            ${reminder.message}
          </blockquote>
          <p>Due: <strong>${new Date(reminder.dueDate).toLocaleString()}</strong></p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);

    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'sent' },
    });
    console.log(`[Reminder] Email sent for reminder ${reminderId}`);
  },
  { connection },
);

worker.on('failed', (job, err) => {
  console.error(`[Reminder] Job ${job?.id} failed:`, err.message);
});

module.exports = { reminderQueue };
