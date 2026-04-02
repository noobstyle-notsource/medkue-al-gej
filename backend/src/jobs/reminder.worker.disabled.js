// Disabled reminder worker - Redis connection issues
// TODO: Fix Redis connection and re-enable

// const IORedis = require('ioredis');
// const { Worker, Queue } = require('bullmq');
// const { Resend } = require('resend');

// const { prisma } = require('../lib/prisma');

// const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
//   maxRetriesPerRequest: null,
// });

// const resend = new Resend(process.env.RESEND_API_KEY);

// // Queue export so controllers can enqueue reminders
// const reminderQueue = new Queue('reminders', { connection });

// // Worker — processes delayed reminder jobs
// const worker = new Worker(
//   'reminders',
//   async (job) => {
//     const { reminderId } = job.data || {};
//     if (!reminderId) return;

//     const reminder = await prisma.reminder.findUnique({
//       where: { id: reminderId },
//       include: {
//         user: { select: { email: true, name: true } },
//         contact: { select: { name: true } },
//       },
//     });

//     if (!reminder || reminder.status === 'sent') return;

//     const { error } = await resend.emails.send({
//       from: process.env.RESEND_FROM || 'CRM SaaS <notifications@yourdomain.com>',
//       to: reminder.user.email,
//       subject: `⏰ Reminder: ${reminder.contact.name}`,
//       html: `
//         <div style="font-family:sans-serif;max-width:500px">
//           <h2>Reminder</h2>
//           <p>Hi <strong>${reminder.user.name}</strong>,</p>
//           <p>You have a scheduled reminder for <strong>${reminder.contact.name}</strong>:</p>
//           <blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #10b981;">
//             ${reminder.message}
//           </blockquote>
//           <p>Due: <strong>${new Date(reminder.dueDate).toLocaleString()}</strong></p>
//         </div>
//       `,
//     });

//     if (error) throw new Error(error.message);

//     await prisma.reminder.update({
//       where: { id: reminderId },
//       data: { status: 'sent' },
//     });
//     console.log(`[Reminder] Email sent for reminder ${reminderId}`);
//   },
//   { connection },
// );

// worker.on('failed', (job, err) => {
//   console.error(`[Reminder] Job ${job?.id} failed:`, err.message);
// });

// module.exports = { reminderQueue };

// Temporary mock for when reminder is disabled
module.exports = { 
  reminderQueue: {
    add: async (name, data, options) => {
      console.log('[Reminder Mock] Would queue reminder:', data);
      return { id: 'mock-id' };
    }
  }
};
