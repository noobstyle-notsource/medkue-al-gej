import {
  AppstoreOutlined,
  ClockCircleOutlined,
  ContainerOutlined,
  LogoutOutlined,
  MessageOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Layout, Tooltip } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.js";

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: "/",              label: "Dashboard",       icon: <ContainerOutlined /> },
  { key: "/deals",         label: "Deals Pipeline",  icon: <AppstoreOutlined /> },
  { key: "/timeline",      label: "Timeline",        icon: <ClockCircleOutlined /> },
  { key: "/contacts",      label: "Contacts",        icon: <TeamOutlined /> },
  { key: "/conversations", label: "Conversations",   icon: <MessageOutlined /> },
];

const PAGE_TITLES = {
  "/":              { title: "Dashboard",      sub: "Your sales overview" },
  "/deals":         { title: "Deal Pipeline",  sub: "Manage your deals by stage" },
  "/timeline":      { title: "Timeline",       sub: "Activity & interaction history" },
  "/contacts":      { title: "Contacts",       sub: "Manage people & companies" },
  "/conversations": { title: "Conversations",  sub: "Internal team messaging" },
};

export default function LayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const currentPath = location.pathname === "/" ? "/" :
    NAV_ITEMS.find((x) => x.key !== "/" && location.pathname.startsWith(x.key))?.key || "/";

  const pageInfo = PAGE_TITLES[currentPath] || { title: "SRM SaaS", sub: "" };

  function handleLogout() {
    logout();
    navigate("/login");
  }

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
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div className="srm-sidebar-logo">
          <div className="srm-logo-icon">S</div>
          <div>
            <div className="srm-logo-text">SRM SaaS</div>
            <div className="srm-logo-sub">Enterprise CRM</div>
          </div>
        </div>

        {/* Nav section label */}
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "var(--text-3)", padding: "16px 20px 6px"
        }}>
          Navigation
        </div>

        {/* Nav Items — custom, not using Ant Menu */}
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(({ key, label, icon }) => {
            const isActive = key === "/" ? currentPath === "/" : currentPath === key;
            return (
              <div
                key={key}
                onClick={() => navigate(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: "var(--radius)",
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
                    width: 3, background: "var(--primary)", borderRadius: "0 2px 2px 0"
                  }} />
                )}
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User card + Logout */}
        <div style={{ padding: "12px 8px" }}>
          <Tooltip title="Click to sign out" placement="right">
            <div className="srm-user-card" onClick={handleLogout}>
              <div className="srm-avatar">U</div>
              <div>
                <div className="srm-user-name">My Account</div>
                <div className="srm-user-role">User</div>
              </div>
              <LogoutOutlined style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-3)", flexShrink: 0 }} />
            </div>
          </Tooltip>
        </div>
      </Sider>

      {/* ── Main ── */}
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
              <div style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)", padding: "4px 14px",
                fontSize: 12, fontWeight: 600, color: "var(--text-2)"
              }}>
                ⚡ SRM v1.0
              </div>
            </div>
          </div>
        </Header>

        <Content style={{ padding: 20, minHeight: "calc(100vh - var(--topbar-h))" }}>
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
