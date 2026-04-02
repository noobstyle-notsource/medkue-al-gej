import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, message, Row, Select, Spin } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const activityTypes = ["call", "email", "meeting"];

const TYPE_ICONS = { call: "📞", email: "✉️", meeting: "🤝" };

export default function TimelinePage() {
  const [loading, setLoading]           = useState(false);
  const [contacts, setContacts]         = useState([]);
  const [activities, setActivities]     = useState([]);
  const [filterContactId, setFilterContactId] = useState(null);
  const [creating, setCreating]         = useState(false);
  const [error, setError]               = useState(null);
  const [form] = Form.useForm();

  async function loadContacts() {
    const res = await api.get("/contacts?limit=1000&page=1");
    setContacts(res.data || []);
  }

  async function loadActivities() {
    setLoading(true);
    setError(null);
    try {
      const res = filterContactId
        ? await api.get(`/activities?contactId=${filterContactId}`)
        : await api.get("/activities");
      setActivities(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContacts().then(() => loadActivities()).catch((e) => setError(e?.message || e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterContactId]);

  async function createActivity(values) {
    setCreating(true);
    try {
      const payload = {
        contactId: values.contactId,
        type: values.type,
        note: values.note,
        happenedAt: values.happenedAt ? values.happenedAt.toISOString() : new Date().toISOString(),
        durationMinutes: values.durationMinutes ?? null,
        outcome: values.outcome ?? null,
      };
      await api.post("/activities", payload);
      form.resetFields();
      message.success("Activity logged");
      await loadActivities();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  }

  const contactOptions = useMemo(
    () => contacts.map((c) => ({ value: c.id, label: c.name })),
    [contacts]
  );

  const contactMap = useMemo(() => {
    const m = {};
    contacts.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [contacts]);

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">Timeline / Activities</div>
          <div className="srm-page-sub">{activities.length} activit{activities.length !== 1 ? "ies" : "y"} logged</div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadActivities} loading={loading}>Refresh</Button>
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
          color: "#fda4af", fontSize: 13
        }}>⚠ {error}</div>
      )}

      <Row gutter={16}>
        {/* Left – Timeline */}
        <Col xs={24} md={14}>
          {/* Filter */}
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <Select
              allowClear
              showSearch
              style={{ flex: 1 }}
              placeholder="Filter by contact…"
              onChange={(v) => setFilterContactId(v || null)}
              options={contactOptions}
            />
          </div>

          <Card className="page-card" bodyStyle={{ padding: "0" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <Spin size="large" />
              </div>
            ) : activities.length === 0 ? (
              <div className="srm-empty">
                <span style={{ fontSize: 32, opacity: 0.3 }}>🕰️</span>
                <span>No activities yet</span>
              </div>
            ) : (
              <div className="srm-timeline" style={{ padding: "4px 16px" }}>
                {activities.map((a, i) => (
                  <div key={a.id || i} className="srm-tl-item">
                    <div className={`srm-tl-dot ${a.type || "call"}`}>
                      {TYPE_ICONS[a.type] || "•"}
                    </div>
                    <div className="srm-tl-body">
                      <div className="srm-tl-title">
                        <span className={`srm-badge ${a.type || "call"}`} style={{ marginRight: 8 }}>
                          {a.type?.toUpperCase()}
                        </span>
                        {a.contactId ? (contactMap[a.contactId] || a.contactId) : ""}
                      </div>
                      {a.note && <div className="srm-tl-note">{a.note}</div>}
                      <div className="srm-tl-meta">
                        {a.happenedAt && new Date(a.happenedAt).toLocaleString()}
                        {a.durationMinutes ? ` · ${a.durationMinutes} min` : ""}
                        {a.outcome ? ` · ${a.outcome}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Right – Add Activity */}
        <Col xs={24} md={10}>
          <Card className="page-card" title={<span><PlusOutlined style={{ marginRight: 8 }} />Log Activity</span>}>
            <Form form={form} layout="vertical" onFinish={createActivity}>
              <Form.Item name="contactId" label="Contact" rules={[{ required: true }]}>
                <Select showSearch options={contactOptions} placeholder="Select contact" />
              </Form.Item>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Form.Item name="type" label="Type" initialValue="call" rules={[{ required: true }]}>
                  <Select options={activityTypes.map((t) => ({ value: t, label: `${TYPE_ICONS[t]} ${t}` }))} />
                </Form.Item>
                <Form.Item name="durationMinutes" label="Duration (min)">
                  <InputNumber min={0} style={{ width: "100%" }} placeholder="e.g. 30" />
                </Form.Item>
              </div>
              <Form.Item name="happenedAt" label="When" initialValue={dayjs()}>
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="note" label="Notes" rules={[{ required: true }]}>
                <Input.TextArea rows={3} placeholder="What happened?" />
              </Form.Item>
              <Form.Item name="outcome" label="Outcome (optional)">
                <Input placeholder="e.g. Follow-up scheduled" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={creating} block style={{ height: 40 }}>
                  Log Activity
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
