import { ArrowLeftOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Spin } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useNavigate, useParams } from "react-router-dom";

export default function DealDetailsPage() {
  const navigate = useNavigate();
  const { dealId } = useParams();

  const [loading, setLoading] = useState(false);
  const [deal, setDeal]       = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError]     = useState(null);
  const [sending, setSending] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [commentsRes] = await Promise.all([
        api.get(`/deals/${dealId}/comments`),
      ]);
      setComments(commentsRes.data || []);
      // Try to fetch deal info too
      try {
        const dealRes = await api.get(`/deals/${dealId}`);
        setDeal(dealRes.data);
      } catch (_) {}
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dealId]);

  async function addComment(values) {
    setSending(true);
    try {
      await api.post(`/deals/${dealId}/comments`, { body: values.body });
      form.resetFields();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/deals")}
            style={{ borderRadius: "var(--radius-full)", width: 36, height: 36, padding: 0 }}
          />
          <div>
            <div className="srm-page-title">
              {deal?.title || "Deal Details"}
            </div>
            <div className="srm-page-sub" style={{ fontFamily: "monospace", fontSize: 11 }}>
              #{dealId}
            </div>
          </div>
        </div>

        {deal && (
          <div style={{ display: "flex", gap: 8 }}>
            {deal.amount != null && (
              <div style={{
                background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: "var(--radius-full)", padding: "4px 14px",
                fontSize: 14, fontWeight: 700, color: "#6ee7b7"
              }}>
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(deal.amount)}
              </div>
            )}
            {deal.stage && (
              <span className={`srm-badge ${deal.stage}`} style={{ fontSize: 12, padding: "4px 12px" }}>
                {deal.stage}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
          color: "#fda4af", fontSize: 13
        }}>⚠ {error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14, alignItems: "start" }}>
        {/* Comments list */}
        <Card className="page-card" title={`Comments (${comments.length})`} bodyStyle={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <Spin size="large" />
            </div>
          ) : comments.length === 0 ? (
            <div className="srm-empty">
              <span style={{ fontSize: 32, opacity: 0.25 }}>💬</span>
              <span>No comments yet — add the first one</span>
            </div>
          ) : (
            <div style={{ padding: "4px 16px" }}>
              {comments.map((c, i) => (
                <div
                  key={c.id || i}
                  style={{
                    padding: "14px 0",
                    borderBottom: i < comments.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex", gap: 12,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    background: "linear-gradient(135deg, var(--primary), var(--violet))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                  }}>
                    {c.authorId ? c.authorId[0]?.toUpperCase() : "?"}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, color: "var(--text-3)", marginBottom: 4,
                      display: "flex", justifyContent: "space-between"
                    }}>
                      <span>{c.authorId ? `User: ${c.authorId.slice(0, 8)}…` : "Comment"}</span>
                      <span>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap" }}>{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Add comment */}
        <Card className="page-card" title={<span><SendOutlined style={{ marginRight: 8 }} />Add Comment</span>}>
          <Form form={form} layout="vertical" onFinish={addComment}>
            <Form.Item
              name="body"
              label="Comment"
              rules={[{ required: true, message: "Please write something" }]}
            >
              <Input.TextArea rows={4} placeholder="Write your comment…" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={sending} block style={{ height: 40 }}>
                Post Comment
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
