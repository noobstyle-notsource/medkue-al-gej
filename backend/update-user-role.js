require('dotenv/config');
const { prisma } = require('./src/lib/prisma');

async function updateUserRole() {
  try {
    // Find or create a User role for this tenant
    const user = await prisma.user.findUnique({
      where: { email: 'akloppolka1@gmail.com' },
      include: { tenant: true }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Find or create User role with limited permissions
    let userRole = await prisma.role.findFirst({
      where: { 
        tenantId: user.tenantId, 
        name: 'User' 
      }
    });

    if (!userRole) {
      userRole = await prisma.role.create({
        data: {
          tenantId: user.tenantId,
          name: 'User',
          permissions: [
            'contacts:read',
            'contacts:write',
            'deals:read',
            'deals:write',
          ],
        },
      });
    }

    // Update user's role
    const updatedUser = await prisma.user.update({
      where: { email: 'akloppolka1@gmail.com' },
      data: { roleId: userRole.id },
      include: { role: true }
    });

    console.log('✅ User role updated:');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   New Role: ${updatedUser.role.name}`);
    console.log(`   New Permissions: ${JSON.stringify(updatedUser.role.permissions)}`);
    
    const hasAudit = updatedUser.role.permissions.includes('audit:read') || 
                    updatedUser.role.permissions.includes('*');
    console.log(`   Can view audit log: ${hasAudit ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();
