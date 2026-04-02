require('dotenv').config();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const u = await p.user.findFirst({ where: { email: 'misheelmother@gmail.com' } });
  const token = jwt.sign(
    { id: u.id, tenantId: u.tenantId, roleId: u.roleId },
    process.env.JWT_SECRET || 'change-me'
  );
  console.log('Token generated for:', u.email, 'roleId:', u.roleId);

  const endpoints = ['/api/dashboard/summary', '/api/deals'];
  for (const ep of endpoints) {
    const res = await fetch('http://localhost:3000' + ep, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const body = await res.text();
    console.log(`\n[${res.status}] ${ep}`);
    console.log('Body:', body.slice(0, 500));
  }
}
run().catch(console.error);
