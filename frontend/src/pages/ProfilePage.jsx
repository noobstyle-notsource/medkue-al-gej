import { Card, Avatar, Descriptions, Button, Modal, Form, Input, message, Tag } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../components/useAuth.js";

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  if (!user) return <div>Please log in</div>;

  const displayName = user.name || user.email || "User";
  const initials = (displayName || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";

  const roleLabel = user.role?.name || "Member";
  const authProvider = user.googleId ? "Google" : "Email/Password";

  const openEditor = () => {
    form.setFieldsValue({ name: user.name, email: user.email });
    setEditOpen(true);
  };

  const onUpdate = async (values) => {
    setSaving(true);
    console.log("[ProfilePage] Starting profile update with:", values);
    try {
      console.log("[ProfilePage] Calling PATCH /auth/me");
      const res = await api.patch("/auth/me", values);
      console.log("[ProfilePage] Update successful:", res.data);
      message.success("Profile updated successfully");
      setEditOpen(false);
      
      console.log("[ProfilePage] Calling refreshProfile");
      await refreshProfile();
      console.log("[ProfilePage] Profile refreshed successfully");
    } catch (err) {
      console.error("[ProfilePage] Profile update failed:", {
        message: err.message,
        status: err?.response?.status,
        data: err?.response?.data,
        stack: err.stack
      });
      message.error(err?.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
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
          <Button type="primary" onClick={openEditor} icon={<EditOutlined />}>
            Edit Profile
          </Button>
        </div>
      </Card>

      <Modal
        title="Edit Profile"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        okText="Save"
        cancelText="Cancel"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={onUpdate}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please enter your name" }]}
          >
            <Input placeholder="Full Name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email", message: "Please enter a valid email" }]}
          >
            <Input placeholder="Email" />
          </Form.Item>

          <Form.Item label="Login method">
            <Input value={authProvider} disabled />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}