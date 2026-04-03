import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Spin,
  Tag,
} from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

dayjs.extend(relativeTime);

const PRIORITY_OPTS = [
  { value: "high",   label: "🔴 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low",    label: "🟢 Low" },
];

const PRIORITY_COLORS = {
  high:   { bg: "rgba(244,63,94,0.15)",   color: "#fda4af", border: "rgba(244,63,94,0.25)" },
  medium: { bg: "rgba(245,158,11,0.15)",  color: "#fde68a", border: "rgba(245,158,11,0.25)" },
  low:    { bg: "rgba(16,185,129,0.15)",  color: "#6ee7b7", border: "rgba(16,185,129,0.25)" },
};

/** Reminders are stored as Activities with type = "reminder" and a future date */
export default function RemindersPage() {
  const [loading, setLoading]     = useState(false);
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [users, setUsers]         = useState([]);
  const [creating, setCreating]   = useState(false);
  const [error, setError]         = useState(null);
  const [filter, setFilter]       = useState("upcoming"); // upcoming | past | all
  const [form] = Form.useForm();

  const toList = (p) => {
    if (Array.isArray(p)) return p;
    if (Array.isArray(p?.items)) return p.items;
    if (Array.isArray(p?.data)) return p.data;
    return [];
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rRes, cRes, uRes] = await Promise.all([
        api.get("/reminders"),
        api.get("/contacts?limit=500&page=1"),
        api.get("/auth/users"),
      ]);
      setActivities(toList(rRes.data));
      setContacts(toList(cRes.data));
      setUsers(toList(uRes.data));
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createReminder(values) {
    setCreating(true);
    try {
      const payload = {
        companyId: values.contactId,
        message: values.title + (values.notes ? `: ${values.notes}` : ""),
        dueDate: values.remindAt ? values.remindAt.toISOString() : new Date().toISOString(),
      };
      await api.post("/reminders", payload);
      message.success("Reminder created!");
      form.resetFields();
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteReminder(id) {
    try {
      await api.delete(`/reminders/${id}`);
      message.success("Reminder deleted");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    }
  }

  const contactMap = useMemo(() => {
    const m = {};
    contacts.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [contacts]);

  // Show reminders
  const reminders = useMemo(() => {
    const now = new Date();
    return activities
      .filter((r) => {
        const d = new Date(r.dueDate);
        if (filter === "upcoming") return d >= now;
        if (filter === "past")     return d < now;
        return true;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [activities, filter]);

  const upcoming = activities.filter((r) => new Date(r.dueDate) >= new Date() && r.status !== 'cancelled');
  const overdue  = activities.filter((r) => new Date(r.dueDate) < new Date() && r.status === 'pending');

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">Reminders</div>
          <div className="srm-page-sub">
            {upcoming.length} upcoming · {overdue.length > 0 && (
              <span style={{ color: "#fda4af" }}>{overdue.length} overdue</span>
            )}
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
          color: "#fda4af", fontSize: 13,
        }}>⚠ {error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        {/* ── Left: reminder list ── */}
        <div>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { k: "upcoming", label: "Upcoming", icon: "⏰" },
              { k: "past",     label: "Past",     icon: "✅" },
              { k: "all",      label: "All",      icon: "📋" },
            ].map(({ k, label, icon }) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  background: filter === k ? "var(--primary)" : "var(--surface-2)",
                  color: filter === k ? "#fff" : "var(--text-2)",
                  border: `1px solid ${filter === k ? "var(--primary)" : "var(--border-2)"}`,
                  borderRadius: "var(--radius)",
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <Card className="page-card" styles={{ body: { padding: 0 } }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <Spin size="large" />
              </div>
            ) : reminders.length === 0 ? (
              <div className="srm-empty">
                <BellOutlined style={{ fontSize: 36, opacity: 0.2 }} />
                <span>No {filter === "all" ? "" : filter} reminders</span>
              </div>
            ) : (
              reminders.map((r, i) => {
                  const d = new Date(r.dueDate);
                const isOverdue = d < new Date() && r.status === "pending";
                const isSent = r.status === "sent";
                const title = r.message.split(": ")[0];
                const note = r.message.split(": ")[1] || "";
                const pc = isOverdue ? PRIORITY_COLORS.high : PRIORITY_COLORS.low;

                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      padding: "16px 20px",
                      borderBottom: i < reminders.length - 1 ? "1px solid var(--border)" : "none",
                      transition: "background 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: pc.bg, border: `1px solid ${pc.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                    }}>
                      {isOverdue ? "⚠️" : "🔔"}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                        {title}
                      </div>
                      {note && (
                        <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 5 }}>{note}</div>
                      )}
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {r.companyId && (
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                            👤 {contactMap[r.companyId] || r.companyId}
                          </span>
                        )}
                        {r.notes?.includes('(assigned to') && (
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                            👥 {r.notes.split('(assigned to ')[1]?.split(')')[0]}
                          </span>
                        )}
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "1px 7px",
                          borderRadius: 999, background: pc.bg, color: pc.color,
                        }}>
                          {isOverdue ? "⚠ Overdue" : `🕐 ${dayjs(d).fromNow()}`}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {d.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <Popconfirm
                      title="Delete this reminder?"
                      onConfirm={() => deleteReminder(r.id)}
                      okText="Delete"
                      cancelText="No"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small" danger
                        icon={<DeleteOutlined />}
                        style={{ marginTop: 4 }}
                      />
                    </Popconfirm>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* ── Right: Create form ── */}
        <Card
          className="page-card"
          title={<span><PlusOutlined style={{ marginRight: 8 }} />New Reminder</span>}
          style={{ position: "sticky", top: 80 }}
        >
          <Form form={form} layout="vertical" onFinish={createReminder}>
            <Form.Item name="title" label="What to remind?" rules={[{ required: true }]}>
              <Input placeholder="Follow up with client…" />
            </Form.Item>
            <Form.Item name="contactId" label="Contact (optional)">
              <Select
                allowClear showSearch optionFilterProp="label"
                placeholder="Link a contact"
                options={contacts.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
            <Form.Item name="assignTo" label="Assign to user (optional)">
              <Select
                allowClear showSearch optionFilterProp="label"
                placeholder="Assign reminder to user"
                options={users.map((u) => ({ value: u.id, label: u.name || u.email }))}
              />
            </Form.Item>
            <Form.Item name="remindAt" label="Remind at" rules={[{ required: true }]}>
              <DatePicker
                showTime
                style={{ width: "100%" }}
                placeholder="Select date & time"
                disabledDate={(d) => d < dayjs().startOf("day")}
              />
            </Form.Item>
            <Form.Item name="notes" label="Notes (optional)">
              <Input.TextArea rows={2} placeholder="Additional details…" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary" htmlType="submit"
                icon={<BellOutlined />} loading={creating}
                block style={{ height: 40 }}
              >
                Set Reminder
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
