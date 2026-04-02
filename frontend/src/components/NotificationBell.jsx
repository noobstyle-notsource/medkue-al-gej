import { BellOutlined } from '@ant-design/icons';
import { Badge, Drawer, Button, Empty, Space, Tag, Spin } from 'antd';
import { useState } from 'react';
import { useNotifications, getNotificationIcon, getNotificationColor } from '../hooks/useNotifications';

export default function NotificationBell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

  const handleBellClick = async () => {
    setDrawerOpen(true);
    await fetchNotifications();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <>
      {/* Notification Bell */}
      <Badge count={unreadCount} size="small" style={{ backgroundColor: '#ef4444' }}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          onClick={handleBellClick}
          style={{ height: 36, width: 36 }}
        />
      </Badge>

      {/* Notification Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Notifications {unreadCount > 0 && <Badge count={unreadCount} />}</span>
            {unreadCount > 0 && (
              <Button size="small" type="text" onClick={handleMarkAllRead}>Mark all read</Button>
            )}
          </div>
        }
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={400}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description="No notifications" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                style={{
                  padding: 12,
                  border: `1px solid ${notif.isRead ? '#e5e7eb' : '#dbeafe'}`,
                  borderRadius: 8,
                  background: notif.isRead ? '#f9fafb' : '#f0f9ff',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.transform = '';
                }}
              >
                {/* Header: Icon + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{getNotificationIcon(notif.type)}</span>
                  <span style={{ fontWeight: 600, flex: 1, color: 'var(--text)' }}>
                    {notif.title}
                  </span>
                  {!notif.isRead && (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: getNotificationColor(notif.type),
                      flexShrink: 0,
                    }} />
                  )}
                </div>

                {/* Message */}
                <p style={{
                  margin: '6px 0',
                  color: 'var(--text-2)',
                  fontSize: 13,
                  lineHeight: 1.4,
                }}>
                  {notif.message}
                </p>

                {/* Footer: Type + Delete */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--text-3)',
                }}>
                  <Tag
                    style={{
                      background: getNotificationColor(notif.type) + '20',
                      border: `1px solid ${getNotificationColor(notif.type)}40`,
                      color: getNotificationColor(notif.type),
                      fontSize: 10,
                      padding: '2px 6px',
                    }}
                  >
                    {notif.type.replace(/_/g, ' ')}
                  </Tag>
                  <Space size={0}>
                    <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <Button
                      type="text"
                      size="small"
                      onClick={(e) => handleDeleteNotification(e, notif.id)}
                      style={{ fontSize: 10, padding: 0, marginLeft: 8 }}
                    >
                      ✕
                    </Button>
                  </Space>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
