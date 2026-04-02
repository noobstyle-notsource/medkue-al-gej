import { Card, Avatar, Descriptions, Button } from "antd";
import { useAuth } from "../components/useAuth.js";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return <div>Please log in</div>;

  const displayName = user.name || user.email;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div style={{ padding: 24 }}>
      <Card title="My Profile" style={{ maxWidth: 600 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <Avatar size={64} style={{ backgroundColor: "#1890ff", marginRight: 16 }}>
            {initials}
          </Avatar>
          <div>
            <h2>{displayName}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Name">{user.name || "N/A"}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Role">Member</Descriptions.Item>
          <Descriptions.Item label="Tenant ID">{user.tenantId}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16 }}>
          <Button type="primary">Edit Profile</Button>
        </div>
      </Card>
    </div>
  );
}