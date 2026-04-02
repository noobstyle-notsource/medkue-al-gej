import {
  AppstoreOutlined,
  AuditOutlined,
  BellOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  ContainerOutlined,
  EditOutlined,
  FileExcelOutlined,
  LogoutOutlined,
  MessageOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Layout, Tooltip, Modal, Avatar, Descriptions, Button, Form, Input, message } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.js";
import NotificationBell from "./NotificationBell.jsx";
import { useEffect, useState } from "react";

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: "/",              label: "Dashboard",     icon: <ContainerOutlined /> },
  { key: "/deals",         label: "Deals",         icon: <AppstoreOutlined /> },
  { key: "/contacts",      label: "Contacts",      icon: <TeamOutlined /> },
  { key: "/timeline",      label: "Timeline",      icon: <ClockCircleOutlined /> },
  { key: "/reminders",     label: "Reminders",     icon: <BellOutlined /> },
  { key: "/conversations", label: "Messages",      icon: <MessageOutlined /> },
  { key: "/csv",           label: "CSV",           icon: <FileExcelOutlined /> },
  { key: "/audit",         label: "Audit Log",     icon: <AuditOutlined /> },
];

const PAGE_TITLES = {
  "/":              { title: "Dashboard",       sub: "Your sales overview" },
  "/deals":         { title: "Deal Pipeline",   sub: "Manage your deals by stage" },
  "/timeline":      { title: "Timeline",        sub: "Activity & interaction history" },
  "/contacts":      { title: "Contacts",        sub: "Manage people & companies" },
  "/reminders":     { title: "Reminders",       sub: "Upcoming tasks & alerts" },
  "/conversations": { title: "Messages",        sub: "Internal team messaging" },
  "/csv":           { title: "CSV Import/Export", sub: "Bulk manage data" },
  "/audit":         { title: "Audit Log",       sub: "Track all changes" },
};

// Nav group separators
const NAV_GROUPS = [
  { label: "Main",     keys: ["/", "/deals", "/contacts", "/timeline"] },
  { label: "Tools",    keys: ["/reminders", "/conversations", "/csv", "/audit"] },
];

export default function LayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, refreshProfile } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("srm-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("srm-theme", theme);
  }, [theme]);

  const isAdmin = user?.email === 'misheelmother@gmail.com';
  const currentPath =
    location.pathname === "/"
      ? "/"
      : NAV_ITEMS.find((x) => x.key !== "/" && location.pathname.startsWith(x.key))?.key || "/";

  const pageInfo = PAGE_TITLES[currentPath] || { title: "SRM SaaS", sub: "" };

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const handleEditProfile = () => {
    form.setFieldsValue({ name: user?.name, email: user?.email });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    form.resetFields();
  };

  const handleSaveProfile = async (values) => {
    setSaving(true);
    try {
      console.log("[Layout] Updating profile:", values);
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crm_token') || sessionStorage.getItem('crm_token')}`
        },
        body: JSON.stringify(values)
      });
      message.success("Profile updated successfully!");
      await refreshProfile();
      setEditMode(false);
    } catch (err) {
      console.error("[Layout] Profile update failed:", err);
      message.error(err?.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = isAdmin ? 'Admin' : 'Member';

  // Derive initials and display name from JWT payload
  const displayName = user?.name || user?.email || "My Account";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";

  return (
    <Layout className="app-shell" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Sidebar ── */}
      <Sider
        width={230}
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
          {/* Logo */}
          <div className="srm-sidebar-logo">
            <div className="srm-logo-icon">S</div>
            <div>
              <div className="srm-logo-text">SRM SaaS</div>
              <div className="srm-logo-sub">Enterprise CRM</div>
            </div>
          </div>

          {/* Nav Groups */}
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "var(--text-3)", padding: "14px 20px 6px",
              }}>
                {group.label}
              </div>
              <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
                {group.keys.map((key) => {
                  if (key === '/audit' && !isAdmin) return null;
                  const item = NAV_ITEMS.find((n) => n.key === key);
                  if (!item) return null;
                  const isActive = key === "/" ? currentPath === "/" : currentPath === key;
                  return (
                    <div
                      key={key}
                      onClick={() => navigate(key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "9px 12px", borderRadius: "var(--radius)",
                        cursor: "pointer", fontSize: 14, fontWeight: 500,
                        transition: "all 200ms ease",
                        color: isActive ? "var(--primary)" : "var(--text-2)",
                        background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                        border: isActive ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "var(--surface-2)";
                          e.currentTarget.style.color = "var(--text)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-2)";
                        }
                      }}
                    >
                      {isActive && (
                        <span style={{
                          position: "absolute", left: 0, top: "20%", height: "60%",
                          width: 3, background: "var(--primary)", borderRadius: "0 2px 2px 0",
                        }} />
                      )}
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* User card + Profile */}
          <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
            <Tooltip title="Click to view profile" placement="right">
              <div className="srm-user-card" onClick={() => setProfileModalOpen(true)}>
                <div className="srm-avatar" style={{ fontSize: 11 }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="srm-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName}
                  </div>
                  <div className="srm-user-role">
                    {roleLabel}
                  </div>
                </div>
              </div>
            </Tooltip>
          </div>
        </div>
      </Sider>

      {/* ── Main Content ── */}
      <Layout style={{ background: "var(--bg)" }}>
        <Header style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          height: "var(--topbar-h)",
          lineHeight: "var(--topbar-h)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div className="srm-topbar-inner">
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                {pageInfo.title}
              </div>
              {pageInfo.sub && (
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1 }}>
                  {pageInfo.sub}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                shape="circle"
                icon={<BulbOutlined />}
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                style={{ borderColor: "var(--border)", color: "var(--text-2)", height: 36, width: 36 }}
                title="Toggle theme"
              />
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <NotificationBell />
            </div>
          </div>
        </Header>

        <Content style={{ padding: 20, minHeight: "calc(100vh - var(--topbar-h))" }}>
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>

      {/* Profile Modal */}
      <Modal
        title={null}
        open={profileModalOpen}
        onCancel={() => {
          setProfileModalOpen(false);
          setEditMode(false);
          form.resetFields();
        }}
        footer={null}
        centered
        width={editMode ? 500 : 400}
        styles={{ body: { padding: 0, background: 'var(--surface)', color: 'var(--text)' } }}
      >
        {editMode ? (
          // Edit Mode
          <div style={{ padding: "24px", color: 'var(--text)' }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Avatar size={64} style={{ backgroundColor: "#1890ff", marginBottom: 16 }}>
                {initials}
              </Avatar>
              <h2 style={{ marginBottom: 8, color: 'var(--text)' }}>Edit Profile</h2>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveProfile}
            >
              <Form.Item
                name="name"
                label={<span style={{ color: 'var(--text)' }}>Name</span>}
                rules={[{ required: true, message: "Please enter your name" }]}
              >
                <Input placeholder="Full Name" />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span style={{ color: 'var(--text)' }}>Email</span>}
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email" }
                ]}
              >
                <Input placeholder="Email address" />
              </Form.Item>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
                <Button onClick={handleCancelEdit}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={saving} icon={<EditOutlined />}>
                  Save Changes
                </Button>
              </div>
            </Form>
          </div>
        ) : (
          // View Mode
          <div style={{ textAlign: "center", padding: "24px", color: 'var(--text)' }}>
            <Avatar size={80} style={{ backgroundColor: "#1890ff", marginBottom: 16 }}>
              {initials}
            </Avatar>
            <h2 style={{ marginBottom: 8, color: 'var(--text)' }}>{displayName}</h2>
            <Descriptions
              bordered
              column={1}
              size="small"
              style={{ marginBottom: 24, color: 'var(--text)' }}
            >
              <Descriptions.Item label="Name" labelStyle={{ color: 'var(--text-3)' }} contentStyle={{ color: 'var(--text)' }}>{user?.name || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Email" labelStyle={{ color: 'var(--text-3)' }} contentStyle={{ color: 'var(--text)' }}>{user?.email}</Descriptions.Item>
              <Descriptions.Item label="Role" labelStyle={{ color: 'var(--text-3)' }} contentStyle={{ color: 'var(--text)' }}>{roleLabel}</Descriptions.Item>
              <Descriptions.Item label="Tenant ID" labelStyle={{ color: 'var(--text-3)' }} contentStyle={{ color: 'var(--text)' }}>{user?.tenantId}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Button onClick={() => setProfileModalOpen(false)}>Close</Button>
              <Button type="default" onClick={handleEditProfile} icon={<EditOutlined />}>
                View / Edit
              </Button>
              <Button type="primary" danger onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
