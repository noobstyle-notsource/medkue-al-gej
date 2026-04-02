import { Spin, Typography } from "antd";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "../api/client.js";
import { useAuth } from "../components/useAuth.js";

const { Text } = Typography;

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const remember = params.get("remember");

    if (token) {
      const stay = remember === "false" ? false : true;
      setToken(token, stay);
      login(token, stay);
      navigate("/", { replace: true });
      return;
    }
    navigate("/login", { replace: true });
  }, [params, login, navigate]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Spin />
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">Signing you in...</Text>
        </div>
      </div>
    </div>
  );
}
