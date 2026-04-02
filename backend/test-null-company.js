const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNullCompany() {
  const user = await prisma.user.findFirst();
  if (!user) return;

  // Creates a deal with NO company
  await prisma.deal.create({
    data: {
      tenantId: user.tenantId,
      title: 'No Company Deal',
      value: 1000,
      stage: 'Prospect'
    }
  });

  // Now emulate the query
  try {
    const deals = await prisma.deal.findMany({
      where: { tenantId: user.tenantId, company: { deletedAt: null } }
    });
    console.log("Success! Deals:", deals.length);
  } catch (err) {
    console.log("CRASHED!", err.message);
  }
}
testNullCompany();
