const { prisma } = require('../lib/prisma');

// Simple cron that checks for due activities explicitly marked as [REMINDER]
async function processReminders() {
  try {
    const now = new Date();

    // Find due reminders that haven't been picked up
    const reminders = await prisma.activity.findMany({
      where: {
        notes: { startsWith: '[REMINDER] ' },
        date: { lte: now }
      },
      include: {
        tenant: { include: { users: { orderBy: { createdAt: 'asc' }, take: 1 } } },
        company: true
      }
    });

    if (reminders.length === 0) return;

    console.log(`[Cron] Processing ${reminders.length} overdue reminders into chat messages.`);

    for (const r of reminders) {
      // 1. Mark as sent immediately to avoid duplicates
      const newNotes = r.notes.replace('[REMINDER]', '[REMINDER:SENT]');
      await prisma.activity.update({
        where: { id: r.id },
        data: { notes: newNotes }
      });

      // 2. Identify the target user (we'll just use the first user in the tenant, the owner)
      const targetUser = r.tenant.users[0];
      if (!targetUser) continue;

      // 3. Ensure a "System Bot" user exists for this tenant
      let bot = await prisma.user.findFirst({
        where: { tenantId: r.tenantId, name: 'System Reminders' }
      });
      if (!bot) {
        bot = await prisma.user.create({
          data: {
            tenantId: r.tenantId,
            name: 'System Reminders',
            email: `bot_${r.tenantId}@system.local`,
          }
        });
      }

      // 4. Ensure a conversation exists between Bot and Target
      let conv = await prisma.conversation.findFirst({
        where: {
          tenantId: r.tenantId,
          OR: [
            { userAId: targetUser.id, userBId: bot.id },
            { userAId: bot.id, userBId: targetUser.id }
          ]
        }
      });
      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            tenantId: r.tenantId,
            userAId: targetUser.id,
            userBId: bot.id,
          }
        });
      }

      // 5. Send the message!
      const title = r.notes.replace('[REMINDER] ', '').split(' —')[0];
      const detail = r.notes.split(' — ')[1] || '';

      const parts = [
        `🔔 **REMINDER ALERT**`,
        `You have a scheduled reminder: "${title}"`
      ];
      if (r.company) parts.push(`👤 Client: ${r.company.name}`);
      if (detail) parts.push(`📝 Notes: ${detail}`);

      await prisma.message.create({
        data: {
          tenantId: r.tenantId,
          conversationId: conv.id,
          senderId: bot.id,
          body: parts.join('\n')
        }
      });
    }

  } catch (err) {
    console.error('[Cron] Reminder processor error:', err.message);
  }
}

let interval;
function startCron() {
  console.log('[System] Native cron processor started (Polling every 15s)');
  processReminders(); // run once immediately
  interval = setInterval(processReminders, 15000);
}

module.exports = { startCron };
