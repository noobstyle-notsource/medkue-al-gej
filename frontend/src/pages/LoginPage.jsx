import { GoogleOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Checkbox } from "antd";
import { useState } from "react";
import { api } from "../api/client.js";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/useAuth.js";

function StatChip({ icon, label, value }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "rgba(255,255,255,0.11)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 14,
      padding: "12px 16px",
      width: "fit-content",
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)", marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{value}</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [rememberMode, setRememberMode] = useState(true);

  function startGoogleLogin() {
    window.location.href = `http://localhost:3000/api/auth/google?remember=${rememberMode ? 'true' : 'false'}`;
  }

  async function onRegister(values) {
    setError(null); setLoading(true);
    try {
      const res = await api.post("/auth/register", values);
      login(res.data.token, true); // Keep persistent for new registers?
      navigate("/");
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  }

  async function onLogin(values) {
    setError(null); setLoading(true);
    try {
      const res = await api.post("/auth/login", values);
      login(res.data.token, !!values.remember);
      navigate("/");
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  }

  return (
    <>
      <style>{`
        .lp-root {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background: #07080f;
          overflow: hidden;
          position: relative;
        }

        /* ─── LEFT — gradient + content, ALL clipped by diagonal ─── */
        .lp-left {
          position: absolute;
          inset: 0;
          /* diagonal: 0,0 → 60%,0 → 48%,100% → 0,100% */
          clip-path: polygon(0 0, 60% 0, 46% 100%, 0% 100%);
          background: linear-gradient(155deg,
            #0a0118 0%,
            #1e0b4a 18%,
            #5b21b6 45%,
            #9333ea 68%,
            #db2777 88%,
            #f59e0b 100%
          );
          z-index: 1;
          overflow: hidden;
        }

        /* Glow blobs inside the left panel */
        .lp-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        /* Content inside the clipped left panel */
        .lp-left-inner {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 56px 52px;
          /* Keep within safe zone so text isn't near clip edge */
          max-width: 54%;
        }

        @keyframes lp-float-a { 0%,100% { transform: translateY(0);    } 50% { transform: translateY(-7px); } }
        @keyframes lp-float-b { 0%,100% { transform: translateY(-4px); } 50% { transform: translateY(5px);  } }
        @keyframes lp-float-c { 0%,100% { transform: translateY(3px);  } 50% { transform: translateY(-6px); } }

        .lp-chip-a { animation: lp-float-a 5s ease-in-out infinite; }
        .lp-chip-b { animation: lp-float-b 6s ease-in-out 1s infinite; }
        .lp-chip-c { animation: lp-float-c 4.5s ease-in-out 2s infinite; }

        /* ─── RIGHT — form ─── */
        .lp-right {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          width: 46%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          z-index: 2;
          overflow-y: auto;
        }

        .lp-card {
          width: 100%;
          max-width: 400px;
          background: rgba(12, 14, 28, 0.75);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 40px 36px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03);
        }

        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-fade { animation: lp-fade-up 380ms cubic-bezier(0.16,1,0.3,1); }

        .lp-btn {
          width: 100% !important;
          height: 46px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          background: linear-gradient(135deg, #7c3aed, #db2777) !important;
          border: none !important;
          box-shadow: 0 4px 26px rgba(147,51,234,0.4) !important;
          transition: all 200ms ease !important;
        }
        .lp-btn:hover {
          box-shadow: 0 6px 34px rgba(147,51,234,0.55) !important;
          transform: translateY(-1px) !important;
        }

        .lp-btn-google {
          width: 100% !important;
          height: 42px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
          transition: all 200ms ease !important;
        }
        .lp-btn-google:hover {
          background: rgba(255,255,255,0.1) !important;
        }

        .lp-link { color: #c084fc; font-weight: 700; text-decoration: none; }
        .lp-link:hover { color: #e879f9; }

        @media (max-width: 860px) {
          .lp-left  { clip-path: none; position: relative; min-height: 260px; width: 100%; }
          .lp-left-inner { max-width: 100%; position: relative; }
          .lp-right { position: relative; width: 100%; padding: 32px 24px; }
          .lp-root  { flex-direction: column; overflow: auto; }
        }
      `}</style>

      <div className="lp-root">
        {/* ─── LEFT GRADIENT + CONTENT (both clipped) ─── */}
        <div className="lp-left">
          {/* Glow blobs */}
          <div className="lp-blob" style={{ width: 480, height: 480, background: "radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 65%)", top: -140, left: -80 }} />
          <div className="lp-blob" style={{ width: 360, height: 360, background: "radial-gradient(circle, rgba(219,39,119,0.28) 0%, transparent 65%)", bottom: -100, left: "20%" }} />
          <div className="lp-blob" style={{ width: 220, height: 220, background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 65%)", top: "40%", left: "38%" }} />

          {/* Content lives inside the clip — diagonal cuts through it naturally */}
          <div className="lp-left-inner">
            {/* Brand */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 999, padding: "6px 14px", width: "fit-content",
              fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 30,
            }}>
              <span style={{
                width: 20, height: 20, background: "rgba(255,255,255,0.22)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
              }}>⚡</span>
              SRM SaaS Mini
            </div>

            {/* Heading */}
            <h1 style={{
              fontSize: 42, fontWeight: 900, color: "#fff",
              letterSpacing: "-1.5px", lineHeight: 1.08, marginBottom: 14,
            }}>
              {mode === "register" ? "Welcome\nBack!" : "Hello\nFriend!"}
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.62)", lineHeight: 1.75, maxWidth: 280, marginBottom: 40 }}>
              {mode === "register"
                ? "Already a member? Sign in and keep your deals moving."
                : "The CRM that moves at your speed. All your pipeline in one place."}
            </p>

            {/* Floating stat chips — inside the clipped area, so diagonal cuts them cleanly */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="lp-chip-a">
                <StatChip icon="💰" label="Won Revenue" value="$284k" />
              </div>
              <div className="lp-chip-b" style={{ marginLeft: 20 }}>
                <StatChip icon="📈" label="Conversion" value="38.5%" />
              </div>
              <div className="lp-chip-c">
                <StatChip icon="🔥" label="Active Deals" value="6" />
              </div>
            </div>

            {/* Bottom tagline */}
            <div style={{
              marginTop: 48,
              fontSize: 10, color: "rgba(255,255,255,0.28)",
              fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              Enterprise CRM · Secure · Scalable
            </div>
          </div>
        </div>

        {/* ─── RIGHT — form panel ─── */}
        <div className="lp-right">
          <div className="lp-card">
            <div key={mode} className="lp-fade">

              {error && (
                <Alert type="error" message={error} style={{ marginBottom: 20 }}
                  showIcon closable onClose={() => setError(null)} />
              )}

              {mode === "register" ? (
                <>
                  <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 4, color: "#f1f5f9" }}>
                    Create Account
                  </h2>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Set up your workspace in seconds.</p>

                  <Form layout="vertical" onFinish={(v) => onRegister({ organizationName: v.tenantName, name: v.fullName, email: v.email, password: v.password })}>
                    <Form.Item name="tenantName" label="Workspace" rules={[{ required: true }]}>
                      <Input placeholder="Acme Corp" suffix={<UserOutlined />} style={{ minHeight: 42 }} />
                    </Form.Item>
                    <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
                      <Input placeholder="John Smith" suffix={<UserOutlined />} style={{ minHeight: 42 }} />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
                      <Input placeholder="john@company.com" suffix={<MailOutlined />} style={{ minHeight: 42 }} />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, min: 4 }]}>
                      <Input.Password placeholder="Min 4 characters" style={{ minHeight: 42 }} />
                    </Form.Item>
                    <Form.Item style={{ marginTop: 6, marginBottom: 0 }}>
                      <Button type="primary" htmlType="submit" loading={loading} className="lp-btn">Create Account</Button>
                    </Form.Item>
                  </Form>

                  <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
                    Already have an account?{" "}
                    <a href="#" className="lp-link" onClick={(e) => { e.preventDefault(); setMode("login"); setError(null); }}>Sign In</a>
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 4, color: "#f1f5f9" }}>
                    Sign In
                  </h2>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Welcome back — your pipeline awaits.</p>

                  <Form
                    layout="vertical"
                    initialValues={{ remember: true }}
                    onFinish={(v) => onLogin({ identifier: v.email, password: v.password, remember: v.remember })}
                  >
                    <Form.Item name="email" label="Email" rules={[{ required: true }]}>
                      <Input placeholder="you@company.com" suffix={<MailOutlined />} style={{ minHeight: 42 }} />
                    </Form.Item>

                    {/* Password row with inline forgot link */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Password
                      </span>
                      <Link to="/forgot-password" style={{ color: "#c084fc", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        Forgot?
                      </Link>
                    </div>
                    <Form.Item name="password" noStyle rules={[{ required: true }]}>
                      <Input.Password placeholder="Your password" style={{ minHeight: 42 }} />
                    </Form.Item>

                    <Form.Item name="remember" valuePropName="checked" style={{ marginTop: 12, marginBottom: 12 }}>
                      <Checkbox
                        checked={rememberMode}
                        onChange={(e) => setRememberMode(e.target.checked)}
                        style={{ color: "#cbd5e1", fontSize: 13 }}
                      >
                        Remember me for 30 days
                      </Checkbox>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 14 }}>
                      <Button type="primary" htmlType="submit" loading={loading} className="lp-btn">Sign In</Button>
                    </Form.Item>
                  </Form>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: "#334155", fontSize: 12 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                    or
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                  </div>

                  <Button onClick={startGoogleLogin} icon={<GoogleOutlined />} className="lp-btn-google">
                    Continue with Google
                  </Button>

                  <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
                    Don&apos;t have an account?{" "}
                    <a href="#" className="lp-link" onClick={(e) => { e.preventDefault(); setMode("register"); setError(null); }}>Sign Up</a>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
