const jwt = require('jsonwebtoken');
const http = require('http');

async function test() {
  try {
    // 1. Generate token
    const token = jwt.sign(
      { id: '1', tenantId: '1', roleId: '1' },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '7d' }
    );

    // 2. We don't have the user in DB, so let's hit auth directly with a real user
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findFirst({ where: { email: 'misheelmother@gmail.com' } });
    if (!user) {
      console.log("No user found.");
      return;
    }
    const realToken = jwt.sign(
      { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
      process.env.JWT_SECRET || 'change-me'
    );

    console.log("Fetching Deals...");
    const req1 = await fetch('http://localhost:3000/api/deals', {
      headers: { Authorization: `Bearer ${realToken}` }
    });
    console.log("Deals OK:", req1.status);
    const text = await req1.text();
    console.log("Response Body:", text);

  } catch (err) {
    console.log('Crash:', err);
  }
}

test();
