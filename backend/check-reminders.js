require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function checkReminders() {
  try {
    console.log('🔍 Checking reminders...\n');
    
    // Get all reminders
    const reminders = await prisma.reminder.findMany({
      include: {
        user: { select: { email: true, name: true } },
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Found ${reminders.length} reminders:`);
    
    reminders.forEach((reminder, index) => {
      const now = new Date();
      const dueDate = new Date(reminder.dueDate);
      const isOverdue = dueDate < now;
      const minutesUntilDue = Math.floor((dueDate - now) / (1000 * 60));
      
      console.log(`\n${index + 1}. Reminder ID: ${reminder.id}`);
      console.log(`   Contact: ${reminder.contact.name}`);
      console.log(`   User: ${reminder.user.name} (${reminder.user.email})`);
      console.log(`   Message: ${reminder.message}`);
      console.log(`   Status: ${reminder.status}`);
      console.log(`   Due: ${dueDate.toISOString()}`);
      console.log(`   Now: ${now.toISOString()}`);
      console.log(`   Overdue: ${isOverdue ? '✅ YES' : '❌ NO'}`);
      console.log(`   Minutes until due: ${minutesUntilDue}`);
      
      if (reminder.status === 'pending' && isOverdue) {
        console.log(`   🚨 SHOULD HAVE BEEN SENT!`);
      }
    });

    // Check Redis queue
    console.log('\n🔄 Checking Redis queue...');
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({
      url: 'https://main-snipe-86234.upstash.io',
      token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
    });

    try {
      const queueLength = await redis.llen('reminder-queue');
      const queueItems = await redis.lrange('reminder-queue', 0, -1);
      
      console.log(`   Queue length: ${queueLength}`);
      
      if (queueItems.length > 0) {
        console.log('   Queue items:');
        queueItems.forEach((item, index) => {
          const reminder = JSON.parse(item);
          console.log(`     ${index + 1}. ${reminder.name} - Execute at: ${new Date(reminder.executeAt).toISOString()}`);
        });
      } else {
        console.log('   ❌ Queue is empty - no reminders scheduled!');
      }
    } catch (error) {
      console.error('   ❌ Redis queue check failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkReminders();
