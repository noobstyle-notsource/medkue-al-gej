import {
  ReloadOutlined, ArrowUpOutlined, ArrowRightOutlined,
  ThunderboltOutlined, TeamOutlined, FireOutlined,
  ClockCircleOutlined, RiseOutlined,
} from "@ant-design/icons";
import { Button, Spin } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

/* ── tiny helpers ── */
const fmtCurrency = (v) =>
  v == null ? "–" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);

const fmtPct = (v) =>
  v == null ? "–" : `${(v * 100).toFixed(1)}%`;

/* ── Stage config ── */
const STAGES = [
  { key: "prospect",  label: "Prospect",  color: "#6366f1", bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.3)"  },
  { key: "qualified", label: "Qualified", color: "#06b6d4", bg: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.3)"   },
  { key: "proposal",  label: "Proposal",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.3)"  },
  { key: "won",       label: "Won",       color: "#10b981", bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.3)"  },
  { key: "lost",      label: "Lost",      color: "#f43f5e", bg: "rgba(244,63,94,0.15)",   border: "rgba(244,63,94,0.3)"   },
];

/* ── KPI Card ── */
function KpiCard({ icon, label, value, sub, glow, trend }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 18,
      padding: "22px 20px",
      position: "relative",
      overflow: "hidden",
      transition: "all 200ms ease",
      cursor: "default",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${glow}20`; e.currentTarget.style.borderColor = `${glow}40`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      {/* Glow orb */}
      <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle, ${glow}30 0%, transparent 70%)` }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${glow}20`, border: `1px solid ${glow}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, color: glow,
        }}>
          {icon}
        </div>
        {trend != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: trend >= 0 ? "#10b981" : "#f43f5e" }}>
            <ArrowUpOutlined style={{ transform: trend < 0 ? "rotate(180deg)" : "none" }} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", letterSpacing: "-1px", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/* ── Pipeline Bar ── */
function PipelineBar({ deals }) {
  const total = deals.length || 1;
  const grouped = {};
  STAGES.forEach(s => (grouped[s.key] = deals.filter(d => d.stage === s.key)));

  return (
    <div>
      {/* Stacked bar */}
      <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", marginBottom: 16, gap: 2 }}>
        {STAGES.map(s => {
          const pct = (grouped[s.key]?.length || 0) / total * 100;
          if (pct === 0) return null;
          return (
            <div key={s.key} style={{ flex: pct, background: s.color, borderRadius: 999, transition: "flex 600ms ease" }} title={`${s.label}: ${grouped[s.key]?.length}`} />
          );
        })}
      </div>

      {/* Stage rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STAGES.map(s => {
          const count = grouped[s.key]?.length || 0;
          const value = grouped[s.key]?.reduce((a, d) => a + (d.amount || 0), 0) || 0;
          const pct = Math.round(count / total * 100);
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", minWidth: 30, textAlign: "right" }}>{count}</div>
              <div style={{ width: 80, height: 4, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 999, transition: "width 600ms ease" }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.color, minWidth: 54, textAlign: "right" }}>{fmtCurrency(value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ── */
export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [deals, setDeals]     = useState([]);
  const [error, setError]     = useState(null);
  const navigate              = useNavigate();

  async function load() {
    setLoading(true); setError(null);
    try {
      const [sumRes, dealsRes] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/deals"),
      ]);
      setData(sumRes.data);
      setDeals(dealsRes.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 18 ? "Good afternoon" : "Good evening";

  const activePipeline = deals.filter(d => d.stage !== "won" && d.stage !== "lost");
  const pipelineValue  = activePipeline.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>
            {greeting} 👋
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 3 }}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ height: 36 }}>
          Refresh
        </Button>
      </div>

      {error && (
        <div style={{
          background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#fda4af", fontSize: 13
        }}>⚠ {error}</div>
      )}

      {loading && !data ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* ─── KPI Row ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
            <KpiCard
              icon={<ThunderboltOutlined />}
              label="Won Revenue"
              value={fmtCurrency(data?.wonAmount)}
              sub="Total closed"
              glow="#10b981"
              trend={12}
            />
            <KpiCard
              icon={<RiseOutlined />}
              label="Conversion"
              value={fmtPct(data?.conversionRate)}
              sub="Prospect → Won"
              glow="#6366f1"
              trend={4}
            />
            <KpiCard
              icon={<FireOutlined />}
              label="Pipeline Value"
              value={fmtCurrency(pipelineValue)}
              sub={`${activePipeline.length} active deals`}
              glow="#f59e0b"
              trend={null}
            />
            <KpiCard
              icon={<TeamOutlined />}
              label="Contacts"
              value={data?.totalContacts ?? "–"}
              sub="In your CRM"
              glow="#c026d3"
              trend={8}
            />
          </div>

          {/* ─── Middle Row ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 14 }}>

            {/* Pipeline breakdown */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 18, padding: "22px 22px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Pipeline Breakdown</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Deals by stage</div>
                </div>
                <Button size="small" onClick={() => navigate("/deals")} style={{ height: 30, fontSize: 12 }}>
                  View All <ArrowRightOutlined />
                </Button>
              </div>
              {deals.length ? <PipelineBar deals={deals} /> : (
                <div style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>No deals yet</div>
              )}
            </div>

            {/* Upcoming deadlines */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 18, padding: "22px 20px", display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Upcoming Deadlines</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Next {data?.upcomingDeadlines?.length || 0} deals</div>
                </div>
                <ClockCircleOutlined style={{ color: "var(--amber)", fontSize: 16 }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, overflowY: "auto", maxHeight: 260 }}>
                {(data?.upcomingDeadlines || []).length === 0 && (
                  <div style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>All clear! 🎉</div>
                )}
                {(data?.upcomingDeadlines || []).map((d, i) => {
                  const daysLeft = Math.ceil((new Date(d.deadline) - now) / 86400000);
                  const urgent = daysLeft <= 3;
                  const s = STAGES.find(s => s.key === d.stage);
                  return (
                    <div
                      key={d.id || i}
                      onClick={() => d.id && navigate(`/deals/${d.id}`)}
                      style={{
                        padding: "11px 0",
                        borderBottom: i < (data.upcomingDeadlines.length - 1) ? "1px solid var(--border)" : "none",
                        cursor: d.id ? "pointer" : "default",
                        transition: "background 150ms",
                        display: "flex", alignItems: "center", gap: 10,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderRadius = "8px"; e.currentTarget.style.padding = "11px 8px"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.borderRadius = ""; e.currentTarget.style.padding = "11px 0"; }}
                    >
                      {/* Stage dot */}
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s?.color || "#64748b", flexShrink: 0 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{fmtCurrency(d.amount)}</div>
                      </div>

                      <div style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                        background: urgent ? "rgba(244,63,94,0.15)" : "rgba(245,158,11,0.12)",
                        color: urgent ? "#fda4af" : "#fde68a",
                        whiteSpace: "nowrap",
                      }}>
                        {daysLeft <= 0 ? "Overdue!" : `${daysLeft}d`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Bottom Row: Recent Deals ─── */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 22px", borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Recent Deals</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{deals.length} total</div>
              </div>
              <Button size="small" onClick={() => navigate("/deals")}>View Pipeline →</Button>
            </div>

            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 130px 110px 90px",
              padding: "9px 22px",
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
              color: "var(--text-3)", background: "var(--surface-2)",
            }}>
              <span>Deal</span><span>Amount</span><span>Stage</span><span style={{ textAlign: "right" }}>Deadline</span>
            </div>

            {/* Rows */}
            {deals.slice(0, 6).map((d, i) => {
              const s = STAGES.find(st => st.key === d.stage);
              return (
                <div
                  key={d.id}
                  onClick={() => navigate(`/deals/${d.id}`)}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 130px 110px 90px",
                    padding: "13px 22px", fontSize: 13,
                    borderBottom: i < Math.min(deals.length, 6) - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer", transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{d.title}</span>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>{fmtCurrency(d.amount)}</span>
                  <span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: s?.bg, color: s?.color, border: `1px solid ${s?.border}`,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s?.color }} />
                      {d.stage}
                    </span>
                  </span>
                  <span style={{ color: "var(--text-3)", fontSize: 12, textAlign: "right" }}>
                    {d.deadline ? new Date(d.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "–"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
