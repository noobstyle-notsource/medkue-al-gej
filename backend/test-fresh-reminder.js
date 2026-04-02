require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function testFreshReminder() {
  try {
    console.log('🧪 TESTING FRESH REMINDER EMAIL\n');
    console.log('=' .repeat(50));
    
    // Get an unverified user
    const unverifiedUser = await prisma.user.findFirst({
      where: { emailVerified: false }
    });

    if (!unverifiedUser) {
      console.log('❌ No unverified users found');
      return;
    }

    console.log(`👤 Using unverified user: ${unverifiedUser.email}`);
    
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
      console.log('✅ Created test contact');
    }

    // Create a reminder due NOW (immediate processing)
    const dueDate = new Date(Date.now() - 1000); // 1 second ago to trigger immediate processing
    
    const reminder = await prisma.reminder.create({
      data: {
        tenantId: unverifiedUser.tenantId,
        userId: unverifiedUser.id,
        contactId: contact.id,
        message: '🧪 IMMEDIATE TEST - Email should send now!',
        dueDate: dueDate
      }
    });

    console.log('✅ Created immediate reminder:');
    console.log(`   User: ${unverifiedUser.email} (❌ Unverified)`);
    console.log(`   Contact: ${contact.name}`);
    console.log(`   Due: ${dueDate.toLocaleString()} (OVERDUE)`);
    console.log(`   Message: ${reminder.message}`);
    console.log(`   Reminder ID: ${reminder.id}`);

    // Manually add to queue
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({
      url: 'https://main-snipe-86234.upstash.io',
      token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
    });

    const reminderData = {
      id: `${Date.now()}-${Math.random()}`,
      name: 'reminder-job',
      data: { reminderId: reminder.id },
      executeAt: Date.now() - 1000, // Already due
      attempts: 0
    };

    await redis.lpush('reminder-queue', JSON.stringify(reminderData));
    console.log('✅ Added to queue (already due)');

    console.log('\n⏰ Waiting for queue processing...');
    console.log('📧 Check your email at misheelmother@gmail.com in 30 seconds!');
    console.log('🎯 Email should be forwarded from unverified user');
    
    // Wait a bit and check status
    setTimeout(async () => {
      const updatedReminder = await prisma.reminder.findUnique({
        where: { id: reminder.id }
      });
      
      console.log(`\n📊 Reminder status after 30s: ${updatedReminder.status}`);
      
      if (updatedReminder.status === 'sent') {
        console.log('🎉 SUCCESS! Email should be in your inbox!');
      } else {
        console.log('❌ Still pending - check backend logs for errors');
      }
      
      await prisma.$disconnect();
    }, 30000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await prisma.$disconnect();
  }
}

testFreshReminder();
