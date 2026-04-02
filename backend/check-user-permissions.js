require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function checkUserPermissions() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'akloppolka1@gmail.com' },
      include: { 
        role: true,
        tenant: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User Info:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role?.name || 'No role'}`);
    console.log(`   Permissions: ${JSON.stringify(user.role?.permissions || [])}`);
    console.log(`   Tenant: ${user.tenant?.name || 'No tenant'}`);
    
    // Check if they have audit permission
    const hasAudit = user.role?.permissions?.includes('audit:read') || 
                    user.role?.permissions?.includes('*');
    console.log(`   Can view audit log: ${hasAudit ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPermissions();
