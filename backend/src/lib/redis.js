const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisAvailable = false;
let redisErrorLogged = false;

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  connectTimeout: 5000,
  lazyConnect: true,          // Don't connect until .connect() is called
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  redisAvailable = true;
  redisErrorLogged = false;
  console.log('[Redis] Connected');
});

redis.on('close', () => {
  redisAvailable = false;
});

redis.on('error', (err) => {
  redisAvailable = false;
  if (!redisErrorLogged) {
    console.warn('[Redis] Unavailable — background jobs disabled:', err.message);
    redisErrorLogged = true;
  }
});

function isRedisAvailable() {
  return redisAvailable;
}

module.exports = { redis, REDIS_URL, isRedisAvailable };
