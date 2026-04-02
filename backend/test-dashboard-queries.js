const { prisma } = require('./src/lib/prisma');
async function test() {
  try {
    const tenantId = 'cmnc9ngcj0000tlmyxe62q2gt';
    console.log('Testing dashboard queries for tenant:', tenantId);
    
    const [wonAgg, totalDeals, wonCount, upcomingDeals, pipelineBreakdown] = await Promise.all([
      prisma.deal.aggregate({ where: { tenantId, stage: 'Won' }, _sum: { value: true } }),
      prisma.deal.count({ where: { tenantId } }),
      prisma.deal.count({ where: { tenantId, stage: 'Won' } }),
      prisma.deal.findMany({
        where: {
          tenantId,
          stage: { notIn: ['Won', 'Lost'] },
          expectedCloseDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
        },
        include: { company: { select: { name: true } } },
        orderBy: { expectedCloseDate: 'asc' },
        take: 5,
      }),
      prisma.deal.groupBy({
        by: ['stage'],
        where: { tenantId },
        _count: { stage: true },
        _sum: { value: true },
      }),
    ]);
    
    console.log('Success!');
    console.log('Won Agg:', wonAgg);
    console.log('Total Deals:', totalDeals);
    console.log('Won Count:', wonCount);
    console.log('Upcoming Deals:', upcomingDeals.length);
    console.log('Pipeline Breakdown:', pipelineBreakdown);
  } catch (err) {
    console.error('Error during dashboard query:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
