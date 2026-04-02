const { prisma } = require('../lib/prisma');

let crmQueueInstance = null;

/**
 * Get the queue instance (null if Redis is unavailable).
 * Use safeAdd() instead of crmQueue.add() directly.
 */
function getCrmQueue() {
  return crmQueueInstance;
}

async function safeAdd(name, data, opts = {}) {
  if (!crmQueueInstance) {
    console.log(`[Queue] Redis unavailable — skipping job: ${name}`);
    return null;
  }
  try {
    return await crmQueueInstance.add(name, data, opts);
  } catch (err) {
    console.error(`[Queue] Failed to add job ${name}:`, err.message);
    return null;
  }
}

function initQueue(redisConnection) {
  try {
    const { Queue } = require('bullmq');
    crmQueueInstance = new Queue('crm-tasks', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
    console.log('[Queue] BullMQ queue initialized');
  } catch (err) {
    console.error('[Queue] Failed to initialize BullMQ queue:', err.message);
    crmQueueInstance = null;
  }
  return crmQueueInstance;
}

module.exports = { getCrmQueue, safeAdd, initQueue };
