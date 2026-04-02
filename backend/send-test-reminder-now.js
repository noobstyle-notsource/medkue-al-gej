require('dotenv/config');
const { prisma } = require('./src/lib/prisma');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestReminderNow() {
  try {
    console.log('📧 Sending test reminder immediately...\n');
    
    // Get the test reminder we just created
    const reminder = await prisma.reminder.findFirst({
      where: {
        message: { contains: 'Test reminder from Nexus CRM' }
      },
      include: {
        user: { select: { email: true, name: true } },
        contact: { select: { name: true } },
      },
    });

    if (!reminder) {
      console.log('❌ Test reminder not found');
      return;
    }

    console.log('📋 Processing reminder:');
    console.log(`   Contact: ${reminder.contact.name}`);
    console.log(`   User: ${reminder.user.name} (${reminder.user.email})`);
    console.log(`   Message: ${reminder.message}`);
    console.log(`   Due: ${reminder.dueDate}`);

    // Send email to verified address
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'misheelmother@gmail.com', // Your verified email
      subject: `⏰ TEST: Reminder for ${reminder.contact.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
          <div style="text-align:center;margin-bottom:30px">
            <h1 style="color:#10b981;margin:0;">🎉 TEST EMAIL</h1>
            <p style="color:#6b7280;margin:5px 0;">Nexus CRM Reminder System</p>
          </div>
          
          <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0">
            <h2 style="color:#374151;margin-top:0;">Hi ${reminder.user.name}!</h2>
            <p style="color:#6b7280;line-height:1.6;">
              This is a <strong>TEST</strong> reminder from Nexus CRM for <strong>${reminder.contact.name}</strong>:
            </p>
            <blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #10b981;margin:15px 0;">
              <p style="margin:0;color:#374151;">${reminder.message}</p>
            </blockquote>
            <p style="color:#6b7280;font-size:14px;">
              <strong>Originally Due:</strong> ${new Date(reminder.dueDate).toLocaleString()}
            </p>
          </div>
          
          <div style="background:#dcfce7;padding:12px;border-radius:6px;border-left:4px solid #22c55e;">
            <p style="margin:0;color:#166534;font-size:13px;">
              ✅ SUCCESS: The reminder system is working! This email was sent immediately for testing.
            </p>
          </div>
          
          <div style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b;margin-top:15px;">
            <p style="margin:0;color:#92400e;font-size:13px;">
              📝 Note: In production, reminders will be sent automatically when due. This was a manual test.
            </p>
          </div>
          
          <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
          <p style="font-size:12px;color:#6b7280;text-align:center;">
            Sent from Nexus CRM - Your Customer Relationship Management System<br>
            Test sent at ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error(`❌ Email failed: ${error.message}`);
      return;
    }

    // Update reminder status
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: 'sent' },
    });

    console.log(`✅ Email sent successfully!`);
    console.log(`📧 Email ID: ${data.id}`);
    console.log(`📨 Sent to: misheelmother@gmail.com`);
    console.log(`✅ Reminder marked as sent`);

  } catch (error) {
    console.error('❌ Failed to send test reminder:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

sendTestReminderNow();
