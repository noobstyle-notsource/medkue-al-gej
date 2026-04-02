require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function createTestReminder() {
  try {
    console.log('📧 Creating test reminder for misheelmother@gmail.com...\n');
    
    // Find or create a contact for testing
    let contact = await prisma.contact.findFirst({
      where: { 
        email: 'misheelmother@gmail.com',
      }
    });

    if (!contact) {
      // Get the user's tenant
      const user = await prisma.user.findFirst({
        where: { email: 'misheelmother@gmail.com' }
      });

      if (!user) {
        console.log('❌ User misheelmother@gmail.com not found');
        return;
      }

      contact = await prisma.contact.create({
        data: {
          tenantId: user.tenantId,
          name: 'Test Contact',
          email: 'misheelmother@gmail.com',
          phone: '+1234567890',
          company: 'Test Company',
          status: 'Active'
        }
      });
      console.log('✅ Created test contact');
    }

    // Find the user with misheelmother@gmail.com
    const user = await prisma.user.findFirst({
      where: { email: 'misheelmother@gmail.com' }
    });

    if (!user) {
      console.log('❌ User misheelmother@gmail.com not found');
      return;
    }

    // Create a reminder due in 1 minute
    const dueDate = new Date(Date.now() + 60000); // 1 minute from now
    
    const reminder = await prisma.reminder.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        contactId: contact.id,
        message: '🎉 Test reminder from Nexus CRM! This is a test email to verify the reminder system is working.',
        dueDate: dueDate
      }
    });

    console.log('✅ Created test reminder:');
    console.log(`   ID: ${reminder.id}`);
    console.log(`   Contact: ${contact.name}`);
    console.log(`   User: ${user.email}`);
    console.log(`   Due: ${dueDate.toLocaleString()}`);
    console.log(`   Message: ${reminder.message}`);
    
    console.log('\n⏰ You should receive an email in 1 minute at misheelmother@gmail.com!');
    console.log('📧 The reminder system will process it automatically.');

  } catch (error) {
    console.error('❌ Failed to create test reminder:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestReminder();
