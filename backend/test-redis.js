require('dotenv/config');
const IORedis = require('ioredis');

const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

async function testRedis() {
  try {
    await redis.ping();
    console.log('✅ Redis connected successfully');
    
    // Test set/get
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('✅ Redis set/get test:', value);
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
  } finally {
    await redis.quit();
  }
}

testRedis();
