import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, Table, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../components/useAuth.js";

export default function UserManagementPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadUsers = async () => {
    try {
      const res = await api.get("/rbac/users");
      setUsers(res.data || []);
    } catch (e) {
      message.error("Failed to load users");
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get("/rbac/roles");
      setRoles(res.data || []);
    } catch (e) {
      message.error("Failed to load roles");
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const handleCreateUser = async (values) => {
    setLoading(true);
    try {
      await api.post("/rbac/users", values);
      message.success("User created successfully");
      setModalVisible(false);
      form.resetFields();
      await loadUsers();
    } catch (e) {
      message.error(e?.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId, roleId) => {
    try {
      await api.patch(`/rbac/users/${userId}/role`, { roleId });
      message.success("User role updated");
      await loadUsers();
    } catch (e) {
      message.error("Failed to update role");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      key: "role",
      render: (_, record) => (
        <Select
          defaultValue={record.roleId}
          style={{ width: 140 }}
          onChange={(val) => handleChangeRole(record.id, val)}
          disabled={record.id === me?.id} // Don't let yourself demote yourself if you are the only manager
        >
          {roles.map((r) => (
            <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">User Management</div>
          <div className="srm-page-sub">Manage team members in your organization</div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          Add User
        </Button>
      </div>

      <div style={{ marginTop: 24 }}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
        />
      </div>

      <Modal
        title="Add New User"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter the user's name" }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter the user's email" },
              { type: "email", message: "Please enter a valid email" }
            ]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Please enter a password" },
              { min: 6, message: "Password must be at least 6 characters" }
            ]}
          >
            <Input.Password placeholder="Enter a secure password" />
          </Form.Item>

          <Form.Item
            name="roleId"
            label="Role"
          >
            <Select placeholder="Select a role (optional)">
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create User
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}