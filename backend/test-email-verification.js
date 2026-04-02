require('dotenv/config');

async function testEmailVerification() {
  try {
    console.log('🔧 Testing Email Verification System...\n');
    
    // Test 1: Send verification code
    console.log('1️⃣ Sending verification code to misheelmother@gmail.com...');
    
    const sendResponse = await fetch('http://localhost:3000/api/email-verification/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'misheelmother@gmail.com' })
    });
    
    const sendData = await sendResponse.json();
    console.log('✅ Response:', sendData);
    
    if (sendResponse.ok) {
      console.log('\n📧 Check your email for the 6-digit verification code!');
      console.log('⏰ The code will expire in 10 minutes');
      
      // For testing, let's get the code from the database
      const { prisma } = require('./src/lib/prisma');
      const verification = await prisma.emailVerification.findUnique({
        where: { email: 'misheelmother@gmail.com' }
      });
      
      if (verification) {
        console.log(`🔍 For testing - the code is: ${verification.code}`);
        
        // Test 2: Verify the code
        console.log('\n2️⃣ Verifying the code...');
        
        const verifyResponse = await fetch('http://localhost:3000/api/email-verification/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: 'misheelmother@gmail.com', 
            code: verification.code 
          })
        });
        
        const verifyData = await verifyResponse.json();
        console.log('✅ Verification Response:', verifyData);
        
        if (verifyResponse.ok) {
          console.log('\n🎉 Email verification successful!');
          
          // Test 3: Check verification status
          console.log('\n3️⃣ Checking verification status...');
          
          const statusResponse = await fetch('http://localhost:3000/api/email-verification/status/misheelmother@gmail.com');
          const statusData = await statusResponse.json();
          console.log('✅ Status Response:', statusData);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEmailVerification();
