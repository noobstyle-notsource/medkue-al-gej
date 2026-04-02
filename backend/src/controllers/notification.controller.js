const { prisma } = require('../lib/prisma');

/**
 * Create a notification for a user
 * Used by other controllers (reminders, deals, etc.)
 */
const createNotification = async (userId, tenantId, { type, title, message, relatedEntity, relatedEntityId }) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        tenantId,
        type,
        title,
        message,
        relatedEntity,
        relatedEntityId,
      },
    });
  } catch (error) {
    console.error('[Notification] Failed to create:', error.message);
    return null;
  }
};

/**
 * GET /api/notifications — list user's notifications with pagination
 */
const getNotifications = async (req, res) => {
  try {
    const { page = '1', limit = '20', isRead } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { 
      tenantId: req.user.tenantId,
      userId: req.user.id,
    };
    
    // Filter by read status if provided
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({ where }),
    ]);

    // Count unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('[Notification] Get failed:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * PATCH /api/notifications/:id/read — mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
        userId: req.user.id,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('[Notification] Mark read failed:', error);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};

/**
 * PATCH /api/notifications/mark-all-read — mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error('[Notification] Mark all read failed:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

/**
 * DELETE /api/notifications/:id — delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
        userId: req.user.id,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[Notification] Delete failed:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

/**
 * GET /api/notifications/unread-count — get count of unread notifications
 * Useful for notification bell badge
 */
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('[Notification] Unread count failed:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};
