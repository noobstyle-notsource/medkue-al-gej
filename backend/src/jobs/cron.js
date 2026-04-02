const { prisma } = require('../lib/prisma');
const { safeAdd } = require('./queue');

/**
 * Polls for due reminders and queues emails / chat notifications.
 * If Redis is offline, it processes them directly.
 */
async function processReminders() {
  try {
    const now = new Date();
    const { handleReminderEmail, handleReminderChat } = require('./worker');

    // Chat-based reminders from Activity notes
    const activities = await prisma.activity.findMany({
      where: {
        notes: { startsWith: '[REMINDER] ' },
        date: { lte: now },
        deletedAt: null,
      },
    });

    for (const r of activities) {
      const job = await safeAdd('reminder-chat', { activityId: r.id });
      
      // If safeAdd returns null, Redis is likely offline -> process directly
      if (!job) {
        console.log(`[Cron] Redis offline: Processing chat reminder ${r.id} directly`);
        await handleReminderChat({ activityId: r.id });
      }

      await prisma.activity.update({
        where: { id: r.id },
        data: { notes: r.notes.replace('[REMINDER]', '[REMINDER:SENT]') },
      });
    }

    // Dedicated Reminder model
    const reminders = await prisma.reminder.findMany({
      where: { status: 'pending', dueDate: { lte: now }, deletedAt: null },
    });

    for (const rem of reminders) {
      const job = await safeAdd('reminder-email', { reminderId: rem.id });
      
      if (!job) {
        console.log(`[Cron] Redis offline: Processing email reminder ${rem.id} directly`);
        await handleReminderEmail({ reminderId: rem.id });
      }
    }
  } catch (err) {
    console.error('[Cron] Reminder processor error:', err.message);
  }
}

/**
 * Start the BullMQ repeatable cron job.
 * Falls back to setInterval if BullMQ is unavailable.
 */
async function startCron(queue) {
  if (queue) {
    try {
      await queue.add('cron-tick', { type: 'cron-tick' }, {
        repeat: { pattern: '* * * * *' },
      });
      console.log('[Cron] BullMQ repeatable cron started (1 min interval)');
    } catch (err) {
      console.error('[Cron] BullMQ cron failed — falling back to setInterval:', err.message);
      setInterval(processReminders, 60_000);
    }
  } else {
    // Fallback: run directly if Redis is offline
    console.log('[Cron] Redis offline — using setInterval fallback');
    setInterval(processReminders, 60_000);
  }

  // Run immediately on boot
  processReminders();
}

module.exports = { startCron, processReminders };
