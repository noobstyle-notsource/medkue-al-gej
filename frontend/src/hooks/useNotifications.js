import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

/**
 * useNotifications hook
 * Manages user notifications with real-time polling
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (page = 1, isRead = undefined) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page, limit: 20 });
      if (isRead !== undefined) params.append('isRead', isRead);
      
      const response = await api.get(`/notifications?${params}`);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('[useNotifications] Fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('[useNotifications] Unread count fetch failed:', err);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      // Refresh list
      await fetchNotifications();
    } catch (err) {
      console.error('[useNotifications] Mark as read failed:', err);
    }
  }, [fetchNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setUnreadCount(0);
      await fetchNotifications();
    } catch (err) {
      console.error('[useNotifications] Mark all as read failed:', err);
    }
  }, [fetchNotifications]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await fetchUnreadCount();
    } catch (err) {
      console.error('[useNotifications] Delete failed:', err);
    }
  }, [fetchUnreadCount]);

  // Polling: update unread count every 10 seconds
  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Poll every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type) {
  const icons = {
    reminder_due: '⏰',
    deal_won: '🎉',
    deal_lost: '😞',
    deal_created: '✨',
    activity_logged: '📝',
    contact_created: '👤',
  };
  return icons[type] || '🔔';
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type) {
  const colors = {
    reminder_due: '#f59e0b',      // amber
    deal_won: '#10b981',          // emerald
    deal_lost: '#ef4444',         // red
    deal_created: '#3b82f6',      // blue
    activity_logged: '#8b5cf6',   // violet
    contact_created: '#ec4899',   // pink
  };
  return colors[type] || '#6b7280'; // gray
}
