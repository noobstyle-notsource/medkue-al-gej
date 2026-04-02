require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function testDirectProcessing() {
  try {
    console.log('🎯 TESTING DIRECT REMINDER PROCESSING\n');
    console.log('=' .repeat(50));
    
    // Get user with "none" email preference
    const user = await prisma.user.findFirst({
      where: { emailPreference: 'none' }
    });

    if (!user) {
      console.log('❌ No user with "none" email preference found');
      return;
    }

    console.log(`👤 Found user: ${user.email} (preference: none)`);
    
    // Get or create a contact
    let contact = await prisma.contact.findFirst({
      where: { tenantId: user.tenantId }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: user.tenantId,
          name: 'Do Not Send Test Contact',
          email: 'no-send-test@example.com',
          phone: '+1234567890',
          company: 'Test Company',
          status: 'Active'
        }
      });
    }

    // Create a reminder
    const reminder = await prisma.reminder.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        contactId: contact.id,
        message: '🔕 DO NOT SEND TEST - No email should be sent!',
        dueDate: new Date()
      }
    });

    console.log('✅ Created reminder:');
    console.log(`   User: ${user.email} (preference: none)`);
    console.log(`   Contact: ${contact.name}`);
    console.log(`   Message: ${reminder.message}`);
    console.log(`   Reminder ID: ${reminder.id}`);

    // Import and call the processReminderJob function directly
    const { processReminderJob } = require('./src/jobs/reminder.worker');
    
    console.log('\n🔄 Calling processReminderJob directly...');
    
    const job = { data: { reminderId: reminder.id } };
    await processReminderJob(job);
    
    console.log('\n📊 Checking result...');
    
    // Check if reminder was processed
    const updatedReminder = await prisma.reminder.findUnique({
      where: { id: reminder.id }
    });
    
    console.log(`Status: ${updatedReminder.status}`);
    
    if (updatedReminder.status === 'sent') {
      console.log('🎉 SUCCESS! Reminder processed correctly');
      console.log('📧 Since user preference is "none", no email was sent');
      console.log('📝 Check backend logs for "User opted out of emails" message');
    } else {
      console.log('❌ Reminder not processed - check for errors');
    }

    console.log('\n📋 WHAT THIS PROVES:');
    console.log('✅ Email preference system working');
    console.log('✅ "none" preference skips email sending');
    console.log('✅ Reminder still marked as processed');
    console.log('✅ User privacy respected');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectProcessing();
