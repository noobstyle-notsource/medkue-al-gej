import { Alert, Button, Form, Input } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { LockOutlined, ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params]  = useSearchParams();
  const [token, setToken]   = useState("");
  const [error, setError]   = useState(null);
  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setToken(params.get("token") || ""); }, [params]);

  async function onSubmit(values) {
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: values.newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
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
          color: "var(--text-2)", fontSize: 13, marginBottom: 24, textDecoration: "none"
        }}>
          <ArrowLeftOutlined /> Back to Sign In
        </Link>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 26, color: "var(--emerald)"
            }}>
              <CheckCircleOutlined />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Password Updated!</h2>
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: "var(--radius)",
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: "var(--primary)", marginBottom: 20
            }}>
              <LockOutlined />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Set New Password</h2>
            <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 24 }}>
              Create a new secure password for your account.
            </p>

            {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon closable onClose={() => setError(null)} />}

            <Form layout="vertical" onFinish={onSubmit}>
              <Form.Item label="Reset Token" required>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your reset token"
                  style={{ minHeight: 44 }}
                />
              </Form.Item>
              <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 4 }]}>
                <Input.Password autoComplete="new-password" placeholder="Min 4 characters" style={{ minHeight: 44 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" className="btn" disabled={!token} loading={loading}>
                Update Password
              </Button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
