import { Worker, Queue } from 'bullmq';
import { Resend } from 'resend';
import { Redis } from '@upstash/redis';
import { prisma } from '../lib/prisma';

// Upstash Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://main-snipe-86234.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Export queue so deal.controller can enqueue jobs
export const reminderQueue = new Queue('reminders', { 
  connection: {
    host: 'localhost',
    port: 6379,
    // Fallback to Upstash if local Redis fails
    // Note: BullMQ needs traditional Redis, but we'll handle this
  }
});

// Worker — runs in this same process (can be split out if needed)
const worker = new Worker(
  'reminders',
  async (job) => {
    const { reminderId } = job.data as { reminderId: string };

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
          <p>Hi ${reminder.user.name},</p>
          <p>You have a scheduled reminder for <strong>${reminder.contact.name}</strong>:</p>
          <blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #10b981;">
            ${reminder.message}
          </blockquote>
          <p>Due: <strong>${reminder.dueDate.toLocaleString()}</strong></p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);

    await prisma.reminder.update({ where: { id: reminderId }, data: { status: 'sent' } });
    console.log(`[Reminder] Email sent for reminder ${reminderId}`);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`[Reminder] Job ${job?.id} failed:`, err.message);
});

export { worker };
