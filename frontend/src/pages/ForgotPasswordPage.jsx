import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { MailOutlined, ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";

export default function ForgotPasswordPage() {
  const [error, setError]  = useState(null);
  const [sent, setSent]    = useState(false);
  const [devUrl, setDevUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(values) {
    setError(null);
    setDevUrl(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: values.email });
      setSent(true);
      setDevUrl(res.data?.devResetUrl || null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-xl)", padding: "40px", width: "100%", maxWidth: 420,
        position: "relative", zIndex: 2,
        boxShadow: "var(--shadow-lg), 0 0 80px rgba(99,102,241,0.06)"
      }}>
        <Link to="/login" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          color: "var(--text-2)", fontSize: 13, marginBottom: 24,
          textDecoration: "none", transition: "color 150ms"
        }}>
          <ArrowLeftOutlined /> Back to Sign In
        </Link>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 26, color: "var(--emerald)"
            }}>
              <CheckCircleOutlined />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Check your inbox</h2>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20 }}>
              If this email is registered, a password reset link has been sent.
            </p>
            {devUrl && (
              <div style={{
                background: "var(--surface-2)", border: "1px solid var(--border-2)",
                borderRadius: "var(--radius)", padding: "12px 14px",
                marginBottom: 16, textAlign: "left"
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Dev Reset URL
                </div>
                <a href={devUrl} style={{ color: "var(--primary)", fontSize: 12, wordBreak: "break-all" }}>{devUrl}</a>
              </div>
            )}
            <Link to="/login">
              <Button type="primary" style={{ width: "100%", height: 44 }}>Back to Sign In</Button>
            </Link>
          </div>
        ) : (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: "var(--radius)",
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: "var(--primary)", marginBottom: 20
            }}>
              <MailOutlined />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Forgot Password</h2>
            <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 24 }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon closable onClose={() => setError(null)} />}

            <Form layout="vertical" onFinish={onSubmit}>
              <Form.Item name="email" label="Email Address" rules={[{ required: true, type: "email" }]}>
                <Input autoComplete="email" placeholder="you@company.com" suffix={<MailOutlined />} style={{ minHeight: 44 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" className="btn" loading={loading}>
                Send Reset Link
              </Button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
