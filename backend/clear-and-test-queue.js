require('dotenv/config');
const { Redis } = require('@upstash/redis');
const { prisma } = require('./src/lib/prisma');

async function clearAndTestQueue() {
  try {
    console.log('🧹 CLEARING AND TESTING QUEUE\n');
    console.log('=' .repeat(50));
    
    const redis = new Redis({
      url: 'https://main-snipe-86234.upstash.io',
      token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
    });

    console.log('\n1️⃣ Clearing Redis queue completely...');
    await redis.del('reminder-queue');
    console.log('✅ Queue cleared');

    console.log('\n2️⃣ Testing JSON serialization...');
    
    // Test proper JSON
    const testData = {
      id: 'test-123',
      name: 'reminder-job',
      data: { reminderId: 'test-reminder-id' },
      executeAt: Date.now(),
      attempts: 0
    };
    
    const jsonString = JSON.stringify(testData);
    console.log('Test JSON string:', jsonString);
    
    const parsed = JSON.parse(jsonString);
    console.log('Parsed JSON:', parsed);
    
    // Add test item to queue
    await redis.lpush('reminder-queue', jsonString);
    console.log('✅ Added test item to queue');
    
    // Retrieve and check
    const queueItems = await redis.lrange('reminder-queue', 0, -1);
    console.log('Queue items:', queueItems);
    
    console.log('\n3️⃣ Manual processing test...');
    const { processReminderJob } = require('./src/jobs/reminder.worker');
    
    // Create a real reminder to test with
    const unverifiedUser = await prisma.user.findFirst({
      where: { emailVerified: false }
    });

    if (unverifiedUser) {
      const contact = await prisma.contact.findFirst({
        where: { tenantId: unverifiedUser.tenantId }
      });

      const reminder = await prisma.reminder.create({
        data: {
          tenantId: unverifiedUser.tenantId,
          userId: unverifiedUser.id,
          contactId: contact.id,
          message: '🧪 MANUAL PROCESSING TEST!',
          dueDate: new Date()
        }
      });

      console.log(`Created reminder ${reminder.id} for manual processing`);

      // Process directly
      const job = { data: { reminderId: reminder.id } };
      await processReminderJob(job);
      
      console.log('✅ Manual processing completed');
      
      // Check status
      const updatedReminder = await prisma.reminder.findUnique({
        where: { id: reminder.id }
      });
      
      console.log(`Reminder status: ${updatedReminder.status}`);
      
      if (updatedReminder.status === 'sent') {
        console.log('🎉 SUCCESS! Email should be in your inbox!');
      }
    }

    console.log('\n4️⃣ Clearing test data...');
    await redis.del('reminder-queue');
    console.log('✅ Queue cleared again');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

clearAndTestQueue();
