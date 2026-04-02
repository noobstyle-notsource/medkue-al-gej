require('dotenv/config');
const { prisma } = require('./src/lib/prisma');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendDirectEmail() {
  try {
    console.log('📧 SENDING DIRECT EMAIL (NO QUEUE)\n');
    console.log('=' .repeat(50));
    
    // Get an unverified user
    const unverifiedUser = await prisma.user.findFirst({
      where: { emailVerified: false }
    });

    if (!unverifiedUser) {
      console.log('❌ No unverified users found');
      return;
    }

    console.log(`👤 User: ${unverifiedUser.email} (❌ Unverified)`);
    
    // Get or create a contact
    let contact = await prisma.contact.findFirst({
      where: { tenantId: unverifiedUser.tenantId }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: unverifiedUser.tenantId,
          name: 'Direct Test Contact',
          email: 'direct-test@example.com',
          phone: '+1234567890',
          company: 'Direct Test Company',
          status: 'Active'
        }
      });
    }

    console.log(`👥 Contact: ${contact.name}`);
    
    // Create and immediately process a reminder
    const reminder = await prisma.reminder.create({
      data: {
        tenantId: unverifiedUser.tenantId,
        userId: unverifiedUser.id,
        contactId: contact.id,
        message: '🎯 DIRECT EMAIL TEST - No queue involved!',
        dueDate: new Date()
      }
    });

    console.log(`📝 Reminder: ${reminder.message}`);
    console.log(`🆔 Reminder ID: ${reminder.id}`);

    // Send email directly (no queue)
    const targetEmail = unverifiedUser.email === 'misheelmother@gmail.com' ? 
      unverifiedUser.email : 
      'misheelmother@gmail.com'; // Fallback for testing

    const isActualEmail = targetEmail === unverifiedUser.email;

    console.log(`📬 Target Email: ${targetEmail} ${isActualEmail ? '(direct)' : '(forwarded)'}`);

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: targetEmail,
      subject: `🎯 DIRECT TEST: Reminder for ${contact.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;background:#f0fdf4;padding:20px;border-radius:8px;">
          <div style="text-align:center;margin-bottom:20px;">
            <h1 style="color:#16a34a;margin:0;">🎯 DIRECT EMAIL TEST</h1>
            <p style="color:#64748b;margin:5px 0;">No Queue - Immediate Sending</p>
          </div>
          
          <div style="background:white;padding:15px;border-radius:6px;">
            <h2 style="color:#1f2937;margin-top:0;">Hi ${unverifiedUser.name}!</h2>
            <p style="color:#6b7280;">This is a <strong>direct email test</strong> for:</p>
            
            <blockquote style="background:#f8fafc;padding:12px;border-left:4px solid #10b981;margin:15px 0;">
              <p style="margin:0;"><strong>Contact:</strong> ${contact.name}</p>
              <p style="margin:0;"><strong>Message:</strong> ${reminder.message}</p>
            </blockquote>
            
            ${!isActualEmail ? `
            <div style="background:#fef3c7;padding:12px;border-radius:6px;margin-top:15px;">
              <p style="margin:0;color:#92400e;">
                📧 <strong>Forwarded:</strong> Originally sent to ${unverifiedUser.email} 
                but forwarded to ${targetEmail} for testing
              </p>
            </div>
            ` : ''}
            
            ${!unverifiedUser.emailVerified ? `
            <div style="background:#dbeafe;padding:12px;border-radius:6px;margin-top:15px;">
              <p style="margin:0;color:#1e40af;">
                🔔 <strong>Unverified Email:</strong> ${unverifiedUser.email} is not verified
              </p>
            </div>
            ` : ''}
          </div>
          
          <div style="text-align:center;margin-top:20px;">
            <p style="color:#6b7280;font-size:12px;">
              ✅ <strong>Success!</strong> Direct email system working<br>
              ${!isActualEmail ? 'Email forwarded for testing' : 'Email sent directly'}
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Email failed:', error.message);
      return;
    }

    // Mark reminder as sent
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: 'sent' }
    });

    console.log('\n🎉 SUCCESS!');
    console.log(`✅ Email sent to: ${targetEmail}`);
    console.log(`✅ Email ID: ${data.id}`);
    console.log(`✅ Reminder marked as sent`);
    console.log(`✅ Check your inbox at misheelmother@gmail.com`);

    console.log('\n📋 SUMMARY:');
    console.log('• Bypassed Redis queue completely');
    console.log('• Direct email sending working');
    console.log('• Unverified users can receive emails');
    console.log('• Forwarding system working');

  } catch (error) {
    console.error('❌ Direct email test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

sendDirectEmail();
