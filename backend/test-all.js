const jwt = require('jsonwebtoken');

async function testAll() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // Get ALL users to test their tokens
  const users = await prisma.user.findMany();

  for (const user of users) {
    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
      process.env.JWT_SECRET || 'change-me'
    );

    try {
      const res = await fetch('http://localhost:3000/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 500) {
        console.log(`User ${user.email} got 500 on dashboard!`);
        console.log(await res.text());
      } else {
        console.log(`User ${user.email} dashboard OK:`, res.status);
      }
    } catch (err) {
      console.log(`User ${user.email} fetch failed:`, err);
    }
  }
}
testAll();
