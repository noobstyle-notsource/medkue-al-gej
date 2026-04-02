require('dotenv/config');
const { Redis } = require('@upstash/redis');
const { prisma } = require('./src/lib/prisma');

async function fixRedisQueue() {
  try {
    console.log('🔧 FIXING REDIS QUEUE\n');
    console.log('=' .repeat(50));
    
    const redis = new Redis({
      url: 'https://main-snipe-86234.upstash.io',
      token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
    });

    console.log('\n1️⃣ Clearing corrupted queue...');
    await redis.del('reminder-queue');
    console.log('✅ Queue cleared');

    console.log('\n2️⃣ Creating fresh test reminder...');
    
    // Get an unverified user
    const unverifiedUser = await prisma.user.findFirst({
      where: { emailVerified: false }
    });

    if (unverifiedUser) {
      // Get or create a contact
      let contact = await prisma.contact.findFirst({
        where: { tenantId: unverifiedUser.tenantId }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            tenantId: unverifiedUser.tenantId,
            name: 'Test Contact',
            email: 'test@example.com',
            phone: '+1234567890',
            company: 'Test Company',
            status: 'Active'
          }
        });
      }

      // Create a reminder due in 30 seconds
      const dueDate = new Date(Date.now() + 30000);
      
      const reminder = await prisma.reminder.create({
        data: {
          tenantId: unverifiedUser.tenantId,
          userId: unverifiedUser.id,
          contactId: contact.id,
          message: '🧪 Fresh test reminder after queue fix!',
          dueDate: dueDate
        }
      });

      console.log('✅ Created fresh reminder:');
      console.log(`   User: ${unverifiedUser.email} (❌ Unverified)`);
      console.log(`   Contact: ${contact.name}`);
      console.log(`   Due: ${dueDate.toLocaleString()}`);
      console.log(`   Message: ${reminder.message}`);

      // Add to queue properly
      const reminderData = {
        id: `${Date.now()}-${Math.random()}`,
        name: 'reminder-job',
        data: { reminderId: reminder.id },
        executeAt: Date.now() + 30000,
        attempts: 0
      };

      await redis.lpush('reminder-queue', JSON.stringify(reminderData));
      console.log('✅ Added to queue with proper JSON');

      console.log('\n3️⃣ Testing queue processing...');
      
      // Import and test the processing function
      const { processReminderJob } = require('./src/jobs/reminder.worker');
      
      const job = { data: { reminderId: reminder.id } };
      await processReminderJob(job);
      
      console.log('✅ Manual processing completed');
      console.log('\n🎉 Queue is now fixed and working!');
      
    } else {
      console.log('❌ No unverified users found to test with');
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixRedisQueue();
