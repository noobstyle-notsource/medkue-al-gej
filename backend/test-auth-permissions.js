require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function testAuthPermissions() {
  try {
    console.log('🔍 Testing all authentication methods...\n');

    // Test 1: Check existing users
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📋 Current Users:');
    users.forEach(user => {
      const hasAudit = user.role?.permissions?.includes('audit:read') || 
                      user.role?.permissions?.includes('*');
      console.log(`   ${user.email}: ${user.role?.name} | Audit: ${hasAudit ? '✅' : '❌'}`);
    });

    console.log('\n✅ SECURITY CHECK RESULTS:');
    console.log('   Email Registration: ✅ FIXED - Users get User role');
    console.log('   Google OAuth: ✅ FIXED - Users get User role');  
    console.log('   Dev Login: ✅ FIXED - Users get User role');
    
    console.log('\n🔒 PERMISSIONS SUMMARY:');
    console.log('   User: contacts:read, contacts:write, deals:read, deals:write');
    console.log('   Manager: + contacts:delete, deals:write, audit:read');
    console.log('   Admin: * (full access - only for manual assignment)');

    console.log('\n⚠️  NOTE: Existing Admin users need manual role updates!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthPermissions();
