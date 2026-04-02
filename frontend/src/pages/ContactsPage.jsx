import { PlusOutlined, ReloadOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Modal, Select, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const STATUS_OPTIONS = [
  { value: "lead",     label: "Lead" },
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function ContactsPage() {
  const [loading, setLoading]     = useState(false);
  const [contacts, setContacts]   = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError]         = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [search, setSearch]       = useState("");
  const [form] = Form.useForm();

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: c.name })),
    [companies]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [cRes, coRes] = await Promise.all([
        api.get("/contacts?limit=100&page=1"),
        api.get("/companies"),
      ]);
      setContacts(cRes.data || []);
      setCompanies(coRes.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createContact(values) {
    setCreating(true);
    try {
      await api.post("/contacts", values);
      message.success("Contact created");
      form.resetFields();
      setShowCreate(false);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) =>
      [c.name, c.email, c.phone].some((f) => f?.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const companyMap = useMemo(() => {
    const m = {};
    companies.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [companies]);

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">Contacts</div>
          <div className="srm-page-sub">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
            Add Contact
          </Button>
        </div>
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
          color: "#fda4af", fontSize: 13
        }}>⚠ {error}</div>
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        title="Add New Contact"
        onCancel={() => setShowCreate(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={createContact} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="Jane Smith" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+1 555 0100" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="jane@company.com" />
            </Form.Item>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="companyId" label="Company">
              <Select allowClear options={companyOptions} placeholder="Select company" />
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="lead">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          </div>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={creating} block style={{ height: 40 }}>
              Create Contact
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Search */}
      <div style={{ marginBottom: 14, maxWidth: 340 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--text-3)" }} />}
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

      {/* Table card */}
      <Card className="page-card" bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="srm-empty">
            <UserOutlined style={{ fontSize: 32, opacity: 0.25 }} />
            <span>{search ? "No contacts match your search" : "No contacts yet — add one above"}</span>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 130px 180px 130px 90px",
              padding: "11px 18px", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--text-3)", borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
            }}>
              <span>Name</span><span>Phone</span><span>Email</span><span>Company</span><span>Status</span>
            </div>

            {filtered.map((c, i) => (
              <div
                key={c.id || i}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 130px 180px 130px 90px",
                  padding: "13px 18px", fontSize: 13,
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 150ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, color: "var(--text)" }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, var(--primary), var(--violet))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff"
                  }}>
                    {c.name?.[0]?.toUpperCase() || "?"}
                  </span>
                  {c.name || "–"}
                </span>
                <span style={{ color: "var(--text-2)", fontSize: 12 }}>{c.phone || "–"}</span>
                <span style={{ color: "var(--text-2)", fontSize: 12 }}>{c.email || "–"}</span>
                <span style={{ color: "var(--text-2)", fontSize: 12 }}>{c.companyId ? (companyMap[c.companyId] || c.companyId) : "–"}</span>
                <span><span className={`srm-badge ${c.status || "inactive"}`}>{c.status || "–"}</span></span>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
