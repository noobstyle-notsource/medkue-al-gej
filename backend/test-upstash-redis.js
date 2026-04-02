require('dotenv/config');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: 'https://main-snipe-86234.upstash.io',
  token: 'gQAAAAAAAVDaAAIncDI1NWUxZjE5YjJjMjU0MzI3OTM5YTFlOWU2ZGExZTQxN3AyODYyMzQ',
});

async function testUpstashRedis() {
  try {
    console.log('🔍 Testing Upstash Redis connection...');
    
    // Test basic operations
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('✅ Basic test:', value);
    
    // Test list operations (for reminder queue)
    await redis.lpush('test-queue', JSON.stringify({ test: 'reminder1' }));
    await redis.lpush('test-queue', JSON.stringify({ test: 'reminder2' }));
    const queueLength = await redis.llen('test-queue');
    const queueItems = await redis.lrange('test-queue', 0, -1);
    console.log('✅ Queue test:', { length: queueLength, items: queueItems });
    
    // Cleanup
    await redis.del('test-key');
    await redis.del('test-queue');
    
    console.log('✅ Upstash Redis working perfectly!');
    
  } catch (error) {
    console.error('❌ Upstash Redis failed:', error.message);
  }
}

testUpstashRedis();
