import { ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Select, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const RESOURCE_COLORS = {
  activity:     { bg: "rgba(99,102,241,0.15)",  color: "#a5b4fc" },
  company:      { bg: "rgba(6,182,212,0.15)",   color: "#67e8f9" },
  deal:         { bg: "rgba(245,158,11,0.15)",  color: "#fde68a" },
  message:      { bg: "rgba(16,185,129,0.15)",  color: "#6ee7b7" },
  contact:      { bg: "rgba(139,92,246,0.15)",  color: "#c4b5fd" },
};
const ACTION_COLORS = {
  CREATE: { bg: "rgba(16,185,129,0.1)",  color: "#6ee7b7",  border: "rgba(16,185,129,0.25)" },
  UPDATE: { bg: "rgba(245,158,11,0.1)",  color: "#fde68a",  border: "rgba(245,158,11,0.25)" },
  DELETE: { bg: "rgba(244,63,94,0.1)",   color: "#fda4af",  border: "rgba(244,63,94,0.25)" },
};

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}***@${domain}`;
}


export default function AuditLogPage() {
  const [loading, setLoading]       = useState(false);
  const [logs, setLogs]             = useState([]);
  const [error, setError]           = useState(null);
  const [page, setPage]             = useState(1);
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter]     = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page });
      if (resourceFilter) params.set("resource", resourceFilter);
      const res = await api.get(`/audit-logs?${params}`);
      setLogs(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, resourceFilter]);

  const filtered = useMemo(() => {
    if (!actionFilter) return logs;
    return logs.filter((l) => l.action === actionFilter);
  }, [logs, actionFilter]);

  // Count actions for the stats bar
  const stats = useMemo(() => {
    const counts = { CREATE: 0, UPDATE: 0, DELETE: 0 };
    filtered.forEach((l) => { if (counts[l.action] !== undefined) counts[l.action]++; });
    return counts;
  }, [filtered]);

  return (
    <div>
      {/* Header */}
      <div className="srm-page-header">
        <div>
          <div className="srm-page-title">Audit Log</div>
          <div className="srm-page-sub">{filtered.length} entries · tracking all changes</div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
          color: "#fda4af", fontSize: 13,
        }}>
          ⚠ {error}
          {error.includes("permission") && (
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Only users with the <strong>Manager</strong> or <strong>Admin</strong> role can view audit logs.
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(ACTION_COLORS).map(([action, style]) => (
          <div
            key={action}
            style={{
              flex: "1 1 100px",
              padding: "14px 16px",
              borderRadius: "var(--radius)",
              background: style.bg,
              border: `1px solid ${style.border}`,
              cursor: "pointer",
              opacity: actionFilter && actionFilter !== action ? 0.4 : 1,
              transition: "all 150ms",
            }}
            onClick={() => setActionFilter(actionFilter === action ? "" : action)}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: style.color, marginBottom: 4 }}>
              {action}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: style.color }}>
              {stats[action] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Select
          allowClear
          placeholder="Filter by resource"
          value={resourceFilter || undefined}
          onChange={(v) => { setResourceFilter(v || ""); setPage(1); }}
          style={{ width: 200 }}
          options={["company", "contact", "deal", "activity", "message"].map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
        />
        <Select
          allowClear
          placeholder="Filter by action"
          value={actionFilter || undefined}
          onChange={(v) => setActionFilter(v || "")}
          style={{ width: 160 }}
          options={["CREATE", "UPDATE", "DELETE"].map((a) => ({
            value: a,
            label: <span style={{ color: ACTION_COLORS[a]?.color }}>{a}</span>,
          }))}
        />
        {(resourceFilter || actionFilter) && (
          <Button
            onClick={() => { setResourceFilter(""); setActionFilter(""); setPage(1); }}
            size="small"
            style={{ alignSelf: "center" }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="page-card" styles={{ body: { padding: 0 } }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "60px 80px 100px 1fr 140px",
          padding: "10px 18px",
          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--text-3)", borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}>
          <span>Action</span>
          <span>Resource</span>
          <span>ID</span>
          <span>Changed by</span>
          <span style={{ textAlign: "right" }}>When</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="srm-empty">
            <span style={{ fontSize: 36, opacity: 0.2 }}>📋</span>
            <span>No audit log entries found</span>
          </div>
        ) : (
          <>
            {filtered.map((l, i) => {
              const ac = ACTION_COLORS[l.action] || {};
              const rc = RESOURCE_COLORS[l.resource] || RESOURCE_COLORS.activity;
              const when = new Date(l.createdAt);
              const isToday = when.toDateString() === new Date().toDateString();
              return (
                <div
                  key={l.id}
                  style={{
                    display: "grid", gridTemplateColumns: "60px 80px 100px 1fr 140px",
                    padding: "12px 18px", fontSize: 12,
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 150ms",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  <span>
                    <span style={{
                      display: "inline-flex", padding: "2px 7px", borderRadius: 6,
                      background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`,
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                    }}>
                      {l.action}
                    </span>
                  </span>
                  <span>
                    <span style={{
                      display: "inline-flex", padding: "2px 7px", borderRadius: 6,
                      background: rc.bg, color: rc.color, fontSize: 10, fontWeight: 700,
                    }}>
                      {l.resource}
                    </span>
                  </span>
                  <span style={{ color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>
                    {l.resourceId?.slice(0, 10)}…
                  </span>
                  <span style={{ color: "var(--text-2)" }}>
                    {l.user?.name || (l.user?.email ? maskEmail(l.user.email) : (l.userId ? l.userId.slice(0, 8) + "…" : "—"))}
                  </span>
                  <span style={{ color: "var(--text-3)", fontSize: 11, textAlign: "right" }}>
                    {isToday
                      ? when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : when.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    }
                  </span>
                </div>
              );
            })}
          </>
        )}
      </Card>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
        <Button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Previous
        </Button>
        <span style={{ lineHeight: "36px", fontSize: 13, color: "var(--text-2)" }}>
          Page {page}
        </span>
        <Button
          disabled={logs.length < 50}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
