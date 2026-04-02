require('dotenv/config');
const { Redis } = require('@upstash/redis');
const { prisma } = require('./src/lib/prisma');

async function debugReminderQueue() {
  try {
    console.log('🔍 DEBUGGING REMINDER QUEUE\n');
    console.log('=' .repeat(50));
    
    // Check Redis connection
    const redis = new Redis({
      url: 'https://main-snipe-86234.upstash.io',
      token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
    });

    console.log('\n1️⃣ Testing Redis connection...');
    await redis.set('debug-test', 'working');
    const test = await redis.get('debug-test');
    console.log(`✅ Redis connection: ${test === 'working' ? 'OK' : 'FAILED'}`);
    
    console.log('\n2️⃣ Checking reminder queue...');
    const queueLength = await redis.llen('reminder-queue');
    console.log(`Queue length: ${queueLength}`);
    
    if (queueLength > 0) {
      const queueItems = await redis.lrange('reminder-queue', 0, -1);
      console.log('Queue items:');
      queueItems.forEach((item, index) => {
        try {
          const parsed = JSON.parse(item);
          console.log(`  ${index + 1}. ${JSON.stringify(parsed, null, 2)}`);
        } catch (error) {
          console.log(`  ${index + 1}. ❌ Invalid JSON: ${item}`);
        }
      });
    }
    
    console.log('\n3️⃣ Checking pending reminders in database...');
    const pendingReminders = await prisma.reminder.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { email: true, name: true, emailVerified: true } },
        contact: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' }
    });
    
    console.log(`Found ${pendingReminders.length} pending reminders:`);
    pendingReminders.forEach((reminder, index) => {
      const isOverdue = new Date(reminder.dueDate) < new Date();
      console.log(`\n${index + 1}. Reminder ${reminder.id}:`);
      console.log(`   User: ${reminder.user.email} (${reminder.user.emailVerified ? '✅ Verified' : '❌ Unverified'})`);
      console.log(`   Contact: ${reminder.contact.name}`);
      console.log(`   Due: ${reminder.dueDate}`);
      console.log(`   Status: ${reminder.status}`);
      console.log(`   Overdue: ${isOverdue ? '✅ YES' : '❌ NO'}`);
    });
    
    console.log('\n4️⃣ Manually processing one reminder...');
    if (pendingReminders.length > 0) {
      const testReminder = pendingReminders[0];
      console.log(`Processing reminder ${testReminder.id} manually...`);
      
      // Import and call the processReminderJob function
      const { processReminderJob } = require('./src/jobs/reminder.worker');
      
      const job = { data: { reminderId: testReminder.id } };
      await processReminderJob(job);
      
      console.log('✅ Manual processing completed');
    }
    
    console.log('\n5️⃣ Cleaning up test data...');
    await redis.del('debug-test');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugReminderQueue();
