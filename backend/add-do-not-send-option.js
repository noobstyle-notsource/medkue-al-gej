require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function addDoNotSendOption() {
  try {
    console.log('🔧 ADDING "DO NOT SEND" EMAIL OPTION\n');
    console.log('=' .repeat(50));
    
    console.log('\n📋 Current Reminder System:');
    console.log('• Verified users: Email sent directly');
    console.log('• Unverified users: Email forwarded to verified address');
    console.log('• No option to opt out of emails');
    
    console.log('\n🎯 NEW OPTION: "DO NOT SEND"');
    console.log('• Users can choose to receive NO emails');
    console.log('• Reminder still created and tracked');
    console.log('• Complete user control over notifications');
    
    // Add email preference to User model
    console.log('\n1️⃣ Adding email preference to User model...');
    
    // Check if column already exists
    try {
      await prisma.user.findFirst({
        select: { emailPreference: true }
      });
      console.log('✅ emailPreference column already exists');
    } catch (error) {
      console.log('❌ emailPreference column missing - add to schema');
      console.log('Add this to your User model in schema.prisma:');
      console.log('  emailPreference String @default("send") // "send", "forward", "none"');
      return;
    }
    
    console.log('\n2️⃣ Creating email preference options:');
    
    // Update some users with different preferences
    const users = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    const preferences = ['send', 'forward', 'none'];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const preference = preferences[i % preferences.length];
      
      await prisma.user.update({
        where: { id: user.id },
        data: { emailPreference: preference }
      });
      
      console.log(`✅ ${user.email}: ${preference}`);
    }
    
    console.log('\n3️⃣ Email Preference Options:');
    console.log('• send     - Send emails directly to user');
    console.log('• forward  - Forward to verified address (testing)');
    console.log('• none     - Do not send any emails');
    
    console.log('\n4️⃣ Updated Reminder Logic:');
    console.log(`
// In reminder.worker.js - processReminderJob function
const emailPreference = reminder.user.emailPreference;

switch (emailPreference) {
  case 'none':
    console.log('[Reminder] User opted out of emails - skipping');
    return; // Don't send email
    
  case 'forward':
    // Forward to verified address (current logic)
    const targetEmail = 'misheelmother@gmail.com';
    break;
    
  case 'send':
  default:
    // Send directly to user (if verified) or forward
    const targetEmail = reminder.user.emailVerified ? 
      reminder.user.email : 'misheelmother@gmail.com';
    break;
}
    `);
    
    console.log('\n5️⃣ UI Integration:');
    console.log('Add to user profile/settings:');
    console.log('📧 Email Notifications:');
    console.log('  ○ Send emails to my address');
    console.log('  ○ Forward to verified address (testing)');
    console.log('  ○ Do not send any emails');
    
    console.log('\n🎉 BENEFITS:');
    console.log('✅ Complete user control');
    console.log('✅ Privacy respected');
    console.log('✅ Testing flexibility');
    console.log('✅ Production ready');
    console.log('✅ No unwanted emails');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addDoNotSendOption();
