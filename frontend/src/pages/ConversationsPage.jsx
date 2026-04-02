import { SearchOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Form, Input, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../components/useAuth.js";

export default function ConversationsPage() {
  const { user: me } = useAuth(); // decoded JWT {id, ...}

  const [users, setUsers]                               = useState([]);
  const [conversations, setConversations]               = useState([]);
  const [messages, setMessages]                         = useState([]);
  const [selectedConvId, setSelectedConvId]             = useState(null);
  const [loading, setLoading]                           = useState(false);
  const [msgLoading, setMsgLoading]                     = useState(false);
  const [sending, setSending]                           = useState(false);
  const [userSearch, setUserSearch]                     = useState("");
  const [body, setBody]                                 = useState("");

  const messagesEndRef = useRef(null);
  const pollRef        = useRef(null);

  // Build a "name" map from userId → name
  const nameMap = {};
  users.forEach((u) => (nameMap[u.id] = u.name || u.email || u.id.slice(0, 8)));

  // The "other" user in a conversation (not me)
  function otherUser(conv) {
    if (!conv) return null;
    const otherId = conv.userAId === me?.id ? conv.userBId : conv.userAId;
    return users.find((u) => u.id === otherId) || { id: otherId, name: otherId.slice(0, 8) + "…" };
  }

  // Load all tenant users
  async function loadUsers() {
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data || []);
    } catch { /* silent */ }
  }

  // Load conversations
  async function loadConversations() {
    setLoading(true);
    try {
      const res = await api.get("/conversations");
      setConversations(res.data || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  // Load messages for a conversation
  async function loadMessages(convId, silent = false) {
    if (!convId) return;
    if (!silent) setMsgLoading(true);
    try {
      const res = await api.get(`/conversations/${convId}/messages?limit=100&offset=0`);
      setMessages(res.data || []);
    } catch { /* silent */ } finally {
      if (!silent) setMsgLoading(false);
    }
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial load
  useEffect(() => {
    loadUsers();
    loadConversations();
  }, []);

  // When selected conv changes, load messages + start polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedConvId) return;
    loadMessages(selectedConvId);
    pollRef.current = setInterval(() => loadMessages(selectedConvId, true), 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedConvId]);

  // Start or find a conversation with a user
  async function startConversation(userId) {
    try {
      const res = await api.post("/conversations", { otherUserId: userId });
      await loadConversations();
      setSelectedConvId(res.data?.id);
    } catch (e) {
      console.error(e);
    }
  }

  // Send a message
  async function sendMessage() {
    if (!body.trim() || !selectedConvId) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    try {
      await api.post(`/conversations/${selectedConvId}/messages`, { body: text });
      await loadMessages(selectedConvId, true);
    } catch { /* silent */ } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Filter users for search
  const filteredUsers = users.filter((u) => {
    if (u.id === me?.id) return false;
    const q = userSearch.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const selectedOther = otherUser(selectedConv);

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">Messages</div>
          <div className="srm-page-sub">Internal team chat</div>
        </div>
      </div>

      <div className="srm-convo-layout">
        {/* ── Left sidebar ── */}
        <div className="srm-convo-sidebar">
          {/* User search */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 8 }}>
              Team Members
            </div>
            <Input
              prefix={<SearchOutlined style={{ color: "var(--text-3)" }} />}
              placeholder="Search teammates…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              allowClear
              size="small"
            />
          </div>

          {/* User list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading && users.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Spin /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="srm-empty" style={{ padding: "20px" }}>
                <span style={{ fontSize: 20, opacity: 0.3 }}>👥</span>
                <span style={{ fontSize: 12 }}>No teammates found</span>
              </div>
            ) : (
              filteredUsers.map((u) => {
                // Find existing convo with this user
                const existingConv = conversations.find(
                  (c) => (c.userAId === u.id || c.userBId === u.id)
                );
                const isSelected = existingConv?.id === selectedConvId;

                return (
                  <div
                    key={u.id}
                    className={`srm-convo-item ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      if (existingConv) {
                        setSelectedConvId(existingConv.id);
                      } else {
                        startConversation(u.id);
                      }
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, hsl(${(u.name?.charCodeAt(0) || 99) * 3 % 360}, 65%, 55%), hsl(${(u.name?.charCodeAt(1) || 66) * 5 % 360}, 65%, 45%))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, color: "#fff", fontWeight: 700,
                    }}>
                      {(u.name?.[0] || u.email?.[0] || "?").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.name || "Unknown"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email}
                      </div>
                    </div>
                    {!existingConv && (
                      <span style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 999,
                        background: "rgba(99,102,241,0.15)", color: "var(--primary)", fontWeight: 700
                      }}>NEW</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Divider + Conversations list */}
          {conversations.length > 0 && (
            <>
              <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>
                Recent Conversations
              </div>
              <div style={{ overflowY: "auto", maxHeight: 200 }}>
                {conversations.map((c) => {
                  const other = otherUser(c);
                  return (
                    <div
                      key={c.id}
                      className={`srm-convo-item ${c.id === selectedConvId ? "active" : ""}`}
                      onClick={() => setSelectedConvId(c.id)}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, var(--primary), var(--violet))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: "#fff", fontWeight: 700,
                      }}>
                        {(other?.name?.[0] || "?").toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {other?.name || other?.email || "Unknown"}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                          {new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Right message panel ── */}
        <div className="srm-message-panel">
          {/* Chat header */}
          <div className="srm-convo-header">
            {selectedOther ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `linear-gradient(135deg, hsl(${(selectedOther.name?.charCodeAt(0) || 99) * 3 % 360}, 65%, 55%), hsl(${(selectedOther.name?.charCodeAt(1) || 66) * 5 % 360}, 65%, 45%))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "#fff", fontWeight: 700,
                }}>
                  {(selectedOther.name?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    {selectedOther.name || selectedOther.email}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>Online</div>
                </div>
              </div>
            ) : (
              <span style={{ color: "var(--text-3)", fontSize: 13 }}>
                👈 Select a teammate to start chatting
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="srm-messages-list">
            {msgLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Spin /></div>
            ) : !selectedConvId ? (
              <div className="srm-empty">
                <span style={{ fontSize: 48, opacity: 0.15 }}>💬</span>
                <span>Pick a teammate from the left to start a conversation</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="srm-empty">
                <span style={{ fontSize: 36, opacity: 0.2 }}>✉️</span>
                <span>No messages yet — say hello!</span>
              </div>
            ) : (
              messages.map((m, i) => {
                const isMe = m.senderId === me?.id;
                const senderName = isMe ? "You" : (nameMap[m.senderId] || m.senderId?.slice(0, 8) + "…");
                return (
                  <div
                    key={m.id || i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={{
                      fontSize: 10, color: "var(--text-3)", marginBottom: 3,
                      paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0,
                    }}>
                      {senderName}
                    </div>
                    <div style={{
                      maxWidth: "72%",
                      background: isMe
                        ? "linear-gradient(135deg, var(--primary), var(--violet))"
                        : "var(--surface-2)",
                      border: isMe ? "none" : "1px solid var(--border)",
                      borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      padding: "10px 14px",
                      color: isMe ? "#fff" : "var(--text)",
                      fontSize: 13,
                      wordBreak: "break-word",
                    }}>
                      {m.body}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3, paddingRight: isMe ? 4 : 0, paddingLeft: isMe ? 0 : 4 }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {selectedConvId && (
            <div className="srm-msg-input-area">
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <Input.TextArea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ flex: 1, resize: "none", borderRadius: "var(--radius)", fontSize: 13 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={sendMessage}
                  loading={sending}
                  disabled={!body.trim()}
                  style={{ height: 38, flexShrink: 0 }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                Press <kbd style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>Enter</kbd> to send
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
