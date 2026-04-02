require('dotenv/config');
const { Resend } = require('resend');

// Test Resend API key
const resend = new Resend(process.env.RESEND_API_KEY);

console.log('Testing Resend API...');
console.log('API Key:', process.env.RESEND_API_KEY);

resend.emails.send({
  from: 'test@yourdomain.com',
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<p>This is a test email</p>'
}).then(result => {
  console.log('✅ Resend working:', result);
}).catch(error => {
  console.error('❌ Resend failed:', error.message);
});
