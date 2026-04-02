import { Card, Avatar, Button, Form, Input, message, Space, Typography } from "antd";
import { ArrowLeftOutlined, SaveOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../components/useAuth.js";

const { Title, Text } = Typography;

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [form] = Form.useForm();

  if (!user) {
    navigate("/login");
    return null;
  }

  const displayName = user.name || user.email || "User";
  const initials = (displayName || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";

  const roleLabel = user.role?.name || "Member";
  const authProvider = user.googleId ? "Google" : "Email/Password";

  const onFinish = async (values) => {
    console.log("[EditProfilePage] Starting profile update with:", values);
    try {
      console.log("[EditProfilePage] Calling PATCH /auth/me");
      const res = await api.patch("/auth/me", values);
      console.log("[EditProfilePage] Update successful:", res.data);
      message.success("Profile updated successfully!");
      await refreshProfile();
      navigate("/profile");
    } catch (err) {
      console.error("[EditProfilePage] Profile update failed:", {
        message: err.message,
        status: err?.response?.status,
        data: err?.response?.data,
        stack: err.stack
      });
      message.error(err?.response?.data?.error || "Failed to update profile");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "24px 16px"
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header with Back Button */}
        <div style={{ marginBottom: 24 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/profile")}
            style={{
              color: "#fff",
              fontSize: 16,
              padding: "8px 0",
              height: "auto"
            }}
          >
            Back to Profile
          </Button>
        </div>

        {/* Main Card */}
        <Card
          style={{
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "none",
            overflow: "hidden"
          }}
          bodyStyle={{ padding: 0 }}
        >

          {/* Header Section */}
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "40px 32px",
            textAlign: "center",
            color: "#fff"
          }}>
            <Avatar
              size={80}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "4px solid rgba(255,255,255,0.3)",
                marginBottom: 16,
                fontSize: 32
              }}
            >
              {initials}
            </Avatar>
            <Title level={2} style={{ color: "#fff", marginBottom: 8 }}>
              Edit Profile
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}>
              Update your account information
            </Text>
          </div>

          {/* Form Section */}
          <div style={{ padding: "32px" }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                name: user.name || "",
                email: user.email || ""
              }}
              size="large"
            >

              <Form.Item
                name="name"
                label={<span style={{ fontWeight: 600, color: "#374151" }}>Full Name</span>}
                rules={[{ required: true, message: "Please enter your full name" }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "#9CA3AF" }} />}
                  placeholder="Enter your full name"
                  style={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB"
                  }}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span style={{ fontWeight: 600, color: "#374151" }}>Email Address</span>}
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email address" }
                ]}
              >
                <Input
                  prefix={<span style={{ color: "#9CA3AF" }}>📧</span>}
                  placeholder="Enter your email address"
                  style={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB"
                  }}
                />
              </Form.Item>

              {/* Read-only info */}
              <div style={{
                background: "#F9FAFB",
                borderRadius: 12,
                padding: "20px",
                marginBottom: 24,
                border: "1px solid #E5E7EB"
              }}>
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text style={{ color: "#6B7280", fontWeight: 500 }}>Role:</Text>
                    <Text style={{ color: "#374151", fontWeight: 600 }}>{roleLabel}</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text style={{ color: "#6B7280", fontWeight: 500 }}>Login Method:</Text>
                    <Text style={{ color: "#374151", fontWeight: 600 }}>{authProvider}</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text style={{ color: "#6B7280", fontWeight: 500 }}>Tenant ID:</Text>
                    <Text style={{ color: "#374151", fontWeight: 600, fontSize: 12 }}>
                      {user.tenant?.id || user.tenantId}
                    </Text>
                  </div>
                </Space>
              </div>

              {/* Action Buttons */}
              <Form.Item style={{ marginBottom: 0 }}>
                <Space size="middle">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    size="large"
                    style={{
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                      padding: "0 24px",
                      height: 48
                    }}
                  >
                    Save Changes
                  </Button>

                  <Button
                    onClick={() => navigate("/profile")}
                    size="large"
                    style={{
                      borderRadius: 8,
                      padding: "0 24px",
                      height: 48
                    }}
                  >
                    Cancel
                  </Button>
                </Space>
              </Form.Item>

            </Form>
          </div>

        </Card>

      </div>
    </div>
  );
}