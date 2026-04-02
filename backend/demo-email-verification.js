require('dotenv/config');

async function demonstrateEmailVerification() {
  console.log('🎯 EMAIL VERIFICATION SYSTEM DEMO\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Show current email verification status
    console.log('1️⃣ Current Email Verification Status:');
    const statusResponse = await fetch('http://localhost:3000/api/email-verification/status/misheelmother@gmail.com');
    const statusData = await statusResponse.json();
    console.log(`   Email: ${statusData.email}`);
    console.log(`   Verified: ${statusData.emailVerified ? '✅ YES' : '❌ NO'}`);
    
    if (!statusData.emailVerified) {
      console.log('\n2️⃣ Sending Verification Code...');
      
      // Step 2: Send verification code
      const sendResponse = await fetch('http://localhost:3000/api/email-verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'misheelmother@gmail.com' })
      });
      
      const sendData = await sendResponse.json();
      console.log(`   ✅ ${sendData.message}`);
      console.log(`   ⏰ Expires in: ${sendData.expiresIn / 1000 / 60} minutes`);
      
      // Get the code for demo purposes
      const { prisma } = require('./src/lib/prisma');
      const verification = await prisma.emailVerification.findUnique({
        where: { email: 'misheelmother@gmail.com' }
      });
      
      if (verification) {
        console.log(`   🔍 Demo code: ${verification.code}`);
        
        console.log('\n3️⃣ Verifying Code...');
        
        // Step 3: Verify the code
        const verifyResponse = await fetch('http://localhost:3000/api/email-verification/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: 'misheelmother@gmail.com', 
            code: verification.code 
          })
        });
        
        const verifyData = await verifyResponse.json();
        console.log(`   ✅ ${verifyData.message}`);
        
        // Step 4: Check final status
        console.log('\n4️⃣ Final Status:');
        const finalStatusResponse = await fetch('http://localhost:3000/api/email-verification/status/misheelmother@gmail.com');
        const finalStatusData = await finalStatusResponse.json();
        console.log(`   Email: ${finalStatusData.email}`);
        console.log(`   Verified: ${finalStatusData.emailVerified ? '✅ YES' : '❌ NO'}`);
        
        console.log('\n🎉 EMAIL VERIFICATION COMPLETE!');
        console.log('✅ User can now receive reminder emails at their actual address');
      }
    } else {
      console.log('\n✅ Email already verified!');
    }
    
    console.log('\n📋 HOW IT WORKS:');
    console.log('1. User requests verification code');
    console.log('2. System sends 6-digit code via email');
    console.log('3. User enters code to verify email');
    console.log('4. Email marked as verified in database');
    console.log('5. Reminder system sends emails to verified addresses only');
    
    console.log('\n🔒 SECURITY FEATURES:');
    console.log('• 6-digit random codes');
    console.log('• 10-minute expiration');
    console.log('• Attempt tracking');
    console.log('• Code invalidation after use');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

demonstrateEmailVerification();
