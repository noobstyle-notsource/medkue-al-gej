const { prisma } = require('./prisma');

/**
 * Notification types and their default titles/messages
 */
const NOTIFICATION_TYPES = {
  REMINDER_DUE: {
    type: 'reminder_due',
    getTitle: (reminderMsg) => `Reminder: ${reminderMsg}`,
    getMessage: () => 'You have an upcoming reminder',
  },
  DEAL_WON: {
    type: 'deal_won',
    getTitle: (dealTitle) => `🎉 Deal Won: ${dealTitle}`,
    getMessage: (value) => `Congratulations! You won a deal${value ? ` worth $${value.toLocaleString()}` : ''}`,
  },
  DEAL_LOST: {
    type: 'deal_lost',
    getTitle: (dealTitle) => `Deal Lost: ${dealTitle}`,
    getMessage: () => 'A deal has been marked as lost',
  },
  DEAL_CREATED: {
    type: 'deal_created',
    getTitle: (dealTitle) => `New Deal: ${dealTitle}`,
    getMessage: (company) => `A new deal has been created${company ? ` for ${company}` : ''}`,
  },
  ACTIVITY_LOGGED: {
    type: 'activity_logged',
    getTitle: (activityType) => `Activity Logged: ${activityType}`,
    getMessage: (company) => `${company ? `Activity logged for ${company}` : 'Activity has been logged'}`,
  },
  CONTACT_CREATED: {
    type: 'contact_created',
    getTitle: (companyName) => `New Contact: ${companyName}`,
    getMessage: () => 'A new contact has been added',
  },
};

/**
 * Send notification to a user
 * @param {string} userId - Recipient user ID
 * @param {string} tenantId - Tenant ID
 * @param {string} type - Notification type (from NOTIFICATION_TYPES)
 * @param {object} payload - Data for generating title/message
 * @param {object} relatedData - { relatedEntity, relatedEntityId }
 * @returns {Promise<object|null>} Created notification or null on error
 */
async function sendNotification(userId, tenantId, type, payload = {}, relatedData = {}) {
  try {
    // Verify tenant and user exist
    const [user, tenant] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.tenant.findUnique({ where: { id: tenantId } }),
    ]);

    if (!user || !tenant) {
      console.warn(`[Notification] User or tenant not found: ${userId}, ${tenantId}`);
      return null;
    }

    // Verify user belongs to tenant
    if (user.tenantId !== tenantId) {
      console.warn(`[Notification] User ${userId} not in tenant ${tenantId}`);
      return null;
    }

    const typeConfig = NOTIFICATION_TYPES[type];
    if (!typeConfig) {
      console.warn(`[Notification] Unknown type: ${type}`);
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        tenantId,
        type: typeConfig.type,
        title: typeConfig.getTitle(payload.title),
        message: typeConfig.getMessage(payload.message),
        relatedEntity: relatedData.relatedEntity,
        relatedEntityId: relatedData.relatedEntityId,
      },
    });

    console.log(`[Notification] Sent to user ${userId}:`, notification.type);
    return notification;
  } catch (error) {
    console.error('[Notification] Failed to send:', error.message);
    return null;
  }
}

/**
 * Send notification to all team members in a tenant
 * @param {string} tenantId - Tenant ID
 * @param {string} type - Notification type
 * @param {object} payload - Data for title/message
 * @param {object} relatedData - { relatedEntity, relatedEntityId }
 * @param {array} excludeUserIds - User IDs to exclude (e.g., the one who triggered it)
 * @returns {Promise<array>} Array of created notifications
 */
async function broadcastNotification(tenantId, type, payload = {}, relatedData = {}, excludeUserIds = []) {
  try {
    // Get all active users in tenant (except excluded ones)
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        id: { notIn: excludeUserIds },
      },
      select: { id: true },
    });

    const notifications = [];
    for (const user of users) {
      const notif = await sendNotification(user.id, tenantId, type, payload, relatedData);
      if (notif) notifications.push(notif);
    }

    console.log(`[Notification] Broadcast to ${notifications.length} users`);
    return notifications;
  } catch (error) {
    console.error('[Notification] Broadcast failed:', error.message);
    return [];
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  sendNotification,
  broadcastNotification,
};
