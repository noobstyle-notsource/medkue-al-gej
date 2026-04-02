import { ReloadOutlined, SendOutlined, MessageOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Select, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

export default function ConversationsPage() {
  const [loading, setLoading]                   = useState(false);
  const [conversations, setConversations]       = useState([]);
  const [messages, setMessages]                 = useState([]);
  const [selectedConversationId, setSelected]   = useState(null);
  const [error, setError]                       = useState(null);
  const [sending, setSending]                   = useState(false);

  const [formCreate] = Form.useForm();
  const [formSend]   = Form.useForm();

  async function loadConversations() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/conversations");
      setConversations(res.data || []);
      if (!selectedConversationId && res.data?.[0]?.id) {
        setSelected(res.data[0].id);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId) {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await api.get(`/conversations/${conversationId}/messages?limit=50&offset=0`);
      setMessages(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConversations(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (selectedConversationId) loadMessages(selectedConversationId); /* eslint-disable-next-line */ }, [selectedConversationId]);

  async function createConversation() {
    setError(null);
    try {
      const v = await formCreate.validateFields();
      const res = await api.post("/conversations", { otherUserId: v.otherUserId });
      message.success("Conversation ready");
      await loadConversations();
      if (res.data?.id) setSelected(res.data.id);
      formCreate.resetFields();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    }
  }

  async function sendMessage(values) {
    setError(null);
    setSending(true);
    try {
      if (!selectedConversationId) return;
      await api.post(`/conversations/${selectedConversationId}/messages`, { body: values.body });
      formSend.resetFields();
      await loadMessages(selectedConversationId);
    } catch (e) {
      message.error(e?.response?.data?.message || e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">Conversations</div>
          <div className="srm-page-sub">Internal team messaging</div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadConversations} loading={loading}>Refresh</Button>
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
          color: "#fda4af", fontSize: 13
        }}>⚠ {error}</div>
      )}

      <div className="srm-convo-layout">
        {/* Left: Sidebar */}
        <div className="srm-convo-sidebar">
          <div className="srm-convo-header">
            <span>Conversations</span>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 400 }}>
              {conversations.length}
            </span>
          </div>

          {/* New conversation form */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <Form form={formCreate} layout="vertical" onFinish={createConversation}>
              <Form.Item
                name="otherUserId"
                label="New conversation with user ID"
                rules={[{ required: true, message: "User ID required" }]}
                style={{ marginBottom: 8 }}
              >
                <Input placeholder="User UUID…" size="small" />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<MessageOutlined />} size="small" style={{ width: "100%" }}>
                Start / Find
              </Button>
            </Form>
          </div>

          {/* Conversation list */}
          <div className="srm-convo-list">
            {loading && conversations.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                <Spin />
              </div>
            ) : conversations.length === 0 ? (
              <div className="srm-empty" style={{ padding: "30px 20px" }}>
                <span style={{ fontSize: 24, opacity: 0.3 }}>💬</span>
                <span>No conversations</span>
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`srm-convo-item ${c.id === selectedConversationId ? "active" : ""}`}
                  onClick={() => setSelected(c.id)}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, var(--primary), var(--violet))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#fff", fontWeight: 700,
                  }}>
                    {c.id[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="srm-convo-item-id">#{c.id.slice(0, 8)}…</div>
                    <div className="srm-convo-item-sub">User: {c.userAId?.slice(0, 8)}…</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Message panel */}
        <div className="srm-message-panel">
          {/* Header */}
          <div className="srm-convo-header">
            {selectedConversationId ? (
              <span>#{selectedConversationId.slice(0, 16)}…</span>
            ) : (
              <span style={{ color: "var(--text-3)" }}>Select a conversation</span>
            )}
          </div>

          {/* Messages */}
          <div className="srm-messages-list">
            {loading && messages.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                <Spin />
              </div>
            ) : !selectedConversationId ? (
              <div className="srm-empty">
                <span style={{ fontSize: 36, opacity: 0.2 }}>💬</span>
                <span>Select a conversation to view messages</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="srm-empty">
                <span style={{ fontSize: 32, opacity: 0.2 }}>✉️</span>
                <span>No messages yet — send the first one!</span>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={m.id || i} className="srm-msg">
                  <div className="srm-msg-sender">
                    {m.senderId ? `From: ${m.senderId.slice(0, 8)}…` : ""}
                  </div>
                  <div className="srm-msg-body">{m.body}</div>
                  <div className="srm-msg-time">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          {selectedConversationId && (
            <div className="srm-msg-input-area">
              <Form form={formSend} layout="inline" onFinish={sendMessage} style={{ width: "100%", gap: 8 }}>
                <Form.Item
                  name="body"
                  rules={[{ required: true, message: "" }]}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <Input placeholder="Write a message…" onPressEnter={() => formSend.submit()} />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={sending}>
                    Send
                  </Button>
                </Form.Item>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
