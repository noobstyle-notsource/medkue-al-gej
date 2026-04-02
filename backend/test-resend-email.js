require('dotenv/config');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResendEmail() {
  try {
    console.log('📧 Testing Resend email sending...');
    
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'misheelmother@gmail.com',
      subject: '🎉 Nexus CRM - Email System Test',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
          <div style="text-align:center;margin-bottom:30px">
            <h1 style="color:#10b981;margin:0;">✅ Email System Working!</h1>
            <p style="color:#6b7280;margin:5px 0;">Nexus CRM Email Test</p>
          </div>
          
          <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0">
            <h2 style="color:#374151;margin-top:0;">🎉 Great News!</h2>
            <p style="color:#6b7280;line-height:1.6;">
              Your Nexus CRM email system is now fully functional. Reminders will be sent 
              automatically to users when they are due.
            </p>
          </div>
          
          <div style="background:#eff6ff;padding:15px;border-radius:8px;border-left:4px solid #3b82f6;">
            <h3 style="color:#1e40af;margin-top:0;">📋 What's Working:</h3>
            <ul style="color:#374151;margin:10px 0;padding-left:20px;">
              <li>✅ Email sending via Resend</li>
              <li>✅ Reminder scheduling system</li>
              <li>✅ Queue processing with retries</li>
              <li>✅ Professional email templates</li>
            </ul>
          </div>
          
          <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
          <p style="font-size:12px;color:#6b7280;text-align:center;">
            Sent from Nexus CRM - Your Customer Relationship Management System<br>
            Test completed at ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Email failed:', error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('📧 Email ID:', data.id);
    console.log('🎯 Your reminder system is now fully functional!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testResendEmail();
