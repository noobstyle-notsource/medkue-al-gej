require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function testUnverifiedReminders() {
  try {
    console.log('🧪 TESTING UNVERIFIED EMAIL REMINDERS\n');
    console.log('=' .repeat(50));
    
    // Check current users
    const users = await prisma.user.findMany({
      select: { email: true, name: true, emailVerified: true }
    });
    
    console.log('\n👥 Current Users:');
    users.forEach(user => {
      console.log(`   ${user.email}: ${user.emailVerified ? '✅ Verified' : '❌ Unverified'}`);
    });
    
    // Find an unverified user (akloppolka1@gmail.com)
    const unverifiedUser = users.find(u => !u.emailVerified);
    
    if (unverifiedUser) {
      console.log(`\n🎯 Testing with unverified user: ${unverifiedUser.email}`);
      
      // Get or create a contact for this user
      let contact = await prisma.contact.findFirst({
        where: { 
          tenantId: (await prisma.user.findUnique({ where: { email: unverifiedUser.email } })).tenantId
        }
      });
      
      if (!contact) {
        const user = await prisma.user.findUnique({ where: { email: unverifiedUser.email } });
        contact = await prisma.contact.create({
          data: {
            tenantId: user.tenantId,
            name: 'Test Contact for Unverified User',
            email: 'test-contact@example.com',
            phone: '+1234567890',
            company: 'Test Company',
            status: 'Active'
          }
        });
        console.log('✅ Created test contact');
      }
      
      // Create a reminder due in 1 minute
      const dueDate = new Date(Date.now() + 60000); // 1 minute from now
      
      const reminder = await prisma.reminder.create({
        data: {
          tenantId: (await prisma.user.findUnique({ where: { email: unverifiedUser.email } })).tenantId,
          userId: (await prisma.user.findUnique({ where: { email: unverifiedUser.email } })).id,
          contactId: contact.id,
          message: `🧪 Test reminder for UNVERIFIED user ${unverifiedUser.name}!`,
          dueDate: dueDate
        }
      });
      
      console.log('✅ Created reminder for unverified user:');
      console.log(`   User: ${unverifiedUser.email} (❌ Unverified)`);
      console.log(`   Contact: ${contact.name}`);
      console.log(`   Due: ${dueDate.toLocaleString()}`);
      console.log(`   Message: ${reminder.message}`);
      
      console.log('\n📧 WHAT WILL HAPPEN:');
      console.log('1. Reminder will be processed in 1 minute');
      console.log('2. Email will be sent to misheelmother@gmail.com (verified fallback)');
      console.log('3. Email will clearly show it\'s forwarded from unverified user');
      console.log('4. Email will include verification notice');
      
      console.log('\n🎉 BENEFITS:');
      console.log('✅ No more "skipped reminders" for unverified users');
      console.log('✅ Clear indication when email is forwarded');
      console.log('✅ Encourages users to verify their email');
      console.log('✅ Works for testing with any email address');
      
    } else {
      console.log('\n❌ No unverified users found to test with');
      console.log('All users are already verified!');
    }
    
    console.log('\n📋 HOW IT WORKS:');
    console.log('• Unverified users: Emails forwarded to verified address');
    console.log('• Verified users: Emails sent directly to their address');
    console.log('• All emails: Clear status indicators');
    console.log('• Production: Can require verification if desired');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUnverifiedReminders();
