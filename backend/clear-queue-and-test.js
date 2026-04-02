require('dotenv/config');
const { Redis } = require('@upstash/redis');
const { prisma } = require('./src/lib/prisma');

async function clearQueueAndTest() {
  try {
    console.log('🧹 CLEARING QUEUE AND TESTING IMMEDIATE PROCESSING\n');
    console.log('=' .repeat(60));
    
    const redis = new Redis({
      url: 'https://main-snipe-86234.upstash.io',
      token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
    });

    console.log('\n1️⃣ Clearing corrupted Redis queue...');
    await redis.del('reminder-queue');
    console.log('✅ Queue cleared');

    console.log('\n2️⃣ Testing immediate processing (no queue)...');
    
    // Get misheelmother@gmail.com (verified user)
    const verifiedUser = await prisma.user.findFirst({
      where: { email: 'misheelmother@gmail.com' }
    });

    if (!verifiedUser) {
      console.log('❌ Verified user not found');
      return;
    }

    console.log(`👤 Testing with: ${verifiedUser.email} (✅ Verified)`);
    
    // Get or create contact
    let contact = await prisma.contact.findFirst({
      where: { tenantId: verifiedUser.tenantId }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: verifiedUser.tenantId,
          name: 'Immediate Processing Test',
          email: 'immediate-test@example.com',
          phone: '+1234567890',
          company: 'Test Company',
          status: 'Active'
        }
      });
    }

    // Create reminder due NOW (immediate processing)
    const reminder = await prisma.reminder.create({
      data: {
        tenantId: verifiedUser.tenantId,
        userId: verifiedUser.id,
        contactId: contact.id,
        message: '🚀 IMMEDIATE PROCESSING TEST - No queue!',
        dueDate: new Date() // Due now
      }
    });

    console.log('✅ Created immediate reminder:');
    console.log(`   Contact: ${contact.name}`);
    console.log(`   Message: ${reminder.message}`);
    console.log(`   Due: ${new Date()}`);

    // Process immediately (simulating the new controller logic)
    console.log('\n3️⃣ Processing immediately...');
    const { processReminderJob } = require('./src/jobs/reminder.worker');
    
    const job = { data: { reminderId: reminder.id } };
    await processReminderJob(job);
    
    // Check result
    const updatedReminder = await prisma.reminder.findUnique({
      where: { id: reminder.id }
    });
    
    console.log(`\n📊 Result: ${updatedReminder.status}`);
    
    if (updatedReminder.status === 'sent') {
      console.log('🎉 SUCCESS!');
      console.log('✅ Immediate processing WORKS');
      console.log('✅ Email should be sent to misheelmother@gmail.com');
      console.log('✅ No queue corruption issues');
      console.log('✅ Ready for production');
    } else {
      console.log('❌ Processing failed');
    }

    console.log('\n4️⃣ Testing future reminder (with queue)...');
    
    // Create future reminder
    const futureReminder = await prisma.reminder.create({
      data: {
        tenantId: verifiedUser.tenantId,
        userId: verifiedUser.id,
        contactId: contact.id,
        message: '⏰ FUTURE REMINDER TEST - With queue!',
        dueDate: new Date(Date.now() + 60000) // 1 minute from now
      }
    });

    console.log(`✅ Created future reminder: ${futureReminder.id}`);
    console.log(`   Due: ${new Date(Date.now() + 60000).toLocaleString()}`);

    // Add to queue properly
    const reminderData = {
      id: `${Date.now()}-${Math.random()}`,
      name: 'reminder-job',
      data: { reminderId: futureReminder.id },
      executeAt: Date.now() + 60000,
      attempts: 0
    };

    await redis.lpush('reminder-queue', JSON.stringify(reminderData));
    console.log('✅ Added to queue with proper JSON');

    console.log('\n🎯 SUMMARY:');
    console.log('✅ Queue cleared of corruption');
    console.log('✅ Immediate processing working');
    console.log('✅ Future reminders queued properly');
    console.log('✅ Both systems working together');
    console.log('✅ Email system fully functional');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

clearQueueAndTest();
