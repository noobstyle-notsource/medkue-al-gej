import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Modal, Select, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useNavigate } from "react-router-dom";

const stages = ["prospect", "qualified", "proposal", "won", "lost"];

const STAGE_COLORS = {
  prospect: { border: "rgba(99,102,241,0.25)", dot: "#6366f1" },
  qualified: { border: "rgba(6,182,212,0.25)",  dot: "#06b6d4" },
  proposal:  { border: "rgba(245,158,11,0.25)", dot: "#f59e0b" },
  won:       { border: "rgba(16,185,129,0.25)", dot: "#10b981" },
  lost:      { border: "rgba(244,63,94,0.25)",  dot: "#f43f5e" },
};

export default function DealsPipelinePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([api.get("/deals"), api.get("/contacts?limit=1000&page=1")]);
      setDeals(d.data);
      setContacts(c.data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const m = {};
    stages.forEach((s) => (m[s] = []));
    for (const deal of deals) {
      const s = deal.stage || "prospect";
      m[s] = m[s] || [];
      m[s].push(deal);
    }
    return m;
  }, [deals]);

  async function moveStage(dealId, nextStage) {
    try {
      await api.patch(`/deals/${dealId}/stage`, { stage: nextStage });
      message.success("Stage updated");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    }
  }

  async function createDeal(values) {
    setCreating(true);
    try {
      const res = await api.post("/deals", {
        title: values.title,
        amount: values.amount ? Number(values.amount) : 0,
        stage: values.stage,
        deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
        contactId: values.contactId || null,
      });
      message.success("Deal created");
      setShowCreate(false);
      form.resetFields();
      await load();
      if (res.data?.id) navigate(`/deals/${res.data.id}`);
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    } finally {
      setCreating(false);
    }
  }

  const formatCurrency = (v) => {
    if (v == null) return null;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(v);
  };

  return (
    <div>
      {/* Page header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">Deal Pipeline</div>
          <div className="srm-page-sub">{deals.length} deal{deals.length !== 1 ? "s" : ""} across {stages.length} stages</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>New Deal</Button>
        </div>
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
          color: "#fda4af", fontSize: 13
        }}>⚠ {error}</div>
      )}

      {/* Create Deal Modal */}
      <Modal
        open={showCreate}
        title="Create New Deal"
        onCancel={() => setShowCreate(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={createDeal} style={{ marginTop: 8 }}>
          <Form.Item name="title" label="Deal Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Enterprise License Deal" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="amount" label="Amount ($)">
              <Input placeholder="e.g. 50000" />
            </Form.Item>
            <Form.Item name="stage" label="Stage" initialValue="prospect">
              <Select>
                {stages.map((s) => (
                  <Select.Option key={s} value={s}>
                    <span className={`srm-badge ${s}`} style={{ marginRight: 0 }}>{s}</span>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="deadline" label="Deadline (optional)">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="contactId" label="Contact (optional)">
            <Select allowClear showSearch optionFilterProp="children" placeholder="Link a contact">
              {contacts.map((ct) => (
                <Select.Option key={ct.id} value={ct.id}>{ct.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={creating} block style={{ height: 40 }}>
              Create Deal
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Kanban board */}
      {loading && !deals.length ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div className="srm-kanban">
          {stages.map((s) => {
            const col = grouped[s] || [];
            const totalAmt = col.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
            return (
              <div key={s} className="srm-kanban-col">
                {/* Column header */}
                <div className={`srm-kanban-head ${s}`}>
                  <span>{s.toUpperCase()}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {totalAmt > 0 && (
                      <span style={{ fontSize: 10, opacity: 0.8 }}>{formatCurrency(totalAmt)}</span>
                    )}
                    <span className="srm-kanban-count">{col.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="srm-kanban-body">
                  {col.length === 0 && (
                    <div style={{
                      textAlign: "center", padding: "30px 10px",
                      color: "var(--text-3)", fontSize: 12
                    }}>No deals</div>
                  )}
                  {col.map((deal) => (
                    <div key={deal.id} className="srm-deal-card" onClick={() => navigate(`/deals/${deal.id}`)}>
                      <div className="srm-deal-title">{deal.title}</div>
                      {deal.amount != null && (
                        <div className="srm-deal-amount">{formatCurrency(deal.amount)}</div>
                      )}
                      {deal.deadline && (
                        <div className="srm-deal-meta">
                          📅 {new Date(deal.deadline).toLocaleDateString()}
                        </div>
                      )}
                      {/* Stage mover */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginTop: 10 }}
                      >
                        <Select
                          value={deal.stage}
                          size="small"
                          style={{ width: "100%" }}
                          onChange={(v) => moveStage(deal.id, v)}
                          options={stages.map((st) => ({ value: st, label: st }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
