require('dotenv/config');
const { prisma } = require('./src/lib/prisma');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function processOverdueReminders() {
  try {
    console.log('🔧 Processing overdue reminders...\n');
    
    // Get all overdue pending reminders
    const now = new Date();
    const overdueReminders = await prisma.reminder.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: now }
      },
      include: {
        user: { select: { email: true, name: true } },
        contact: { select: { name: true } },
      },
    });

    console.log(`📋 Found ${overdueReminders.length} overdue reminders:`);

    for (const reminder of overdueReminders) {
      console.log(`\n📧 Processing reminder ${reminder.id}:`);
      console.log(`   Contact: ${reminder.contact.name}`);
      console.log(`   User: ${reminder.user.name} (${reminder.user.email})`);
      console.log(`   Message: ${reminder.message}`);
      console.log(`   Due: ${reminder.dueDate}`);

      try {
        // Send real email
        const { data, error } = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: reminder.user.email,
          subject: `⏰ Reminder: ${reminder.contact.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
              <div style="text-align:center;margin-bottom:30px">
                <h1 style="color:#10b981;margin:0;">⏰ Reminder</h1>
                <p style="color:#6b7280;margin:5px 0;">Nexus CRM</p>
              </div>
              
              <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0">
                <h2 style="color:#374151;margin-top:0;">Hi ${reminder.user.name}!</h2>
                <p style="color:#6b7280;line-height:1.6;">
                  You have a scheduled reminder for <strong>${reminder.contact.name}</strong>:
                </p>
                <blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #10b981;margin:15px 0;">
                  <p style="margin:0;color:#374151;">${reminder.message}</p>
                </blockquote>
                <p style="color:#6b7280;font-size:14px;">
                  <strong>Due:</strong> ${new Date(reminder.dueDate).toLocaleString()}
                </p>
              </div>
              
              <div style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b;">
                <p style="margin:0;color:#92400e;font-size:13px;">
                  ⚠️ This reminder was overdue and is being sent now.
                </p>
              </div>
              
              <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
              <p style="font-size:12px;color:#6b7280;text-align:center;">
                Sent from Nexus CRM - Your Customer Relationship Management System<br>
                Processed at ${new Date().toLocaleString()}
              </p>
            </div>
          `,
        });

        if (error) {
          console.error(`   ❌ Email failed: ${error.message}`);
          continue;
        }

        // Update reminder status
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'sent' },
        });

        console.log(`   ✅ Email sent successfully! (ID: ${data.id})`);
        console.log(`   ✅ Reminder marked as sent`);

      } catch (error) {
        console.error(`   ❌ Failed to process reminder: ${error.message}`);
      }
    }

    console.log(`\n🎉 Processed ${overdueReminders.length} overdue reminders!`);

  } catch (error) {
    console.error('❌ Processing failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

processOverdueReminders();
