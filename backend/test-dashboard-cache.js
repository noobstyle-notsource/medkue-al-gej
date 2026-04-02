require('dotenv/config');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: 'https://main-snipe-86234.upstash.io',
  token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
});

async function testDashboardCache() {
  try {
    console.log('🔍 Testing dashboard cache...');
    
    const tenantId = 'test-tenant';
    const cacheKey = `dashboard:${tenantId}`;
    const testData = { wonAmount: 1000, totalDeals: 5 };
    
    // Test setex
    await redis.setex(cacheKey, 300, JSON.stringify(testData));
    console.log('✅ Cache set successful');
    
    // Test get
    const cached = await redis.get(cacheKey);
    const parsedData = typeof cached === 'string' ? JSON.parse(cached) : cached;
    console.log('✅ Cache get successful:', parsedData);
    
    // Test del
    await redis.del(cacheKey);
    const afterDelete = await redis.get(cacheKey);
    console.log('✅ Cache delete successful:', afterDelete === null);
    
    console.log('✅ Dashboard cache working perfectly!');
    
  } catch (error) {
    console.error('❌ Dashboard cache failed:', error.message);
  }
}

testDashboardCache();
