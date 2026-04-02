import { Card, Avatar, Descriptions, Button, Tag } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/useAuth.js";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return <div>Please log in</div>;

  const displayName = user.name || user.email || "User";
  const initials = (displayName || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";

  const roleLabel = user.role?.name || "Member";
  const authProvider = user.googleId ? "Google" : "Email/Password";

  const handleEditProfile = () => {
    navigate("/profile/edit");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="My Profile" style={{ maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <Avatar size={64} style={{ backgroundColor: "#1890ff", marginRight: 16 }}>
            {initials}
          </Avatar>
          <div>
            <h2 style={{ marginBottom: 4 }}>{displayName}</h2>
            <p style={{ margin: 0 }}>{user.email}</p>
            <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
              <Tag color={user.googleId ? "cyan" : "blue"} style={{ fontWeight: 700 }}>
                {authProvider} login
              </Tag>
              <Tag color={roleLabel === "Admin" ? "volcano" : "green"}>{roleLabel}</Tag>
            </div>
          </div>
        </div>

        <Descriptions bordered column={1}>
          <Descriptions.Item label="Name">{user.name || "N/A"}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Role">{roleLabel}</Descriptions.Item>
          <Descriptions.Item label="Tenant ID">{user.tenant?.id || user.tenantId}</Descriptions.Item>
          <Descriptions.Item label="Provider">{authProvider}</Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={handleEditProfile} icon={<EditOutlined />}>
            Edit Profile
          </Button>
        </div>
      </Card>
    </div>
  );
}