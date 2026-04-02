require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function checkAllUsers() {
  try {
    const users = await prisma.user.findMany({
      include: { 
        role: true,
        tenant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role?.name || 'No role'}`);
      console.log(`   Permissions: ${JSON.stringify(user.role?.permissions || [])}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Tenant: ${user.tenant?.name}`);
      
      const hasAudit = user.role?.permissions?.includes('audit:read') || 
                      user.role?.permissions?.includes('*');
      console.log(`   Can view audit: ${hasAudit ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();
