const { prisma } = require('./src/lib/prisma');

async function test() {
  try {
    const tenantId = 'cmnc9ngcj0000tlmyxe62q2gt';
    console.log('Testing with deletedAt: null filter...');
    
    const result = await prisma.deal.groupBy({
      by: ['stage'],
      where: { tenantId, deletedAt: null },
      _count: { stage: true },
      _sum: { value: true },
    });
    
    console.log('✓ Success with deletedAt filter!');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
