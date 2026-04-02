import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DealsPipelinePage from "./pages/DealsPipelinePage.jsx";
import DealDetailsPage from "./pages/DealDetailsPage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import ContactsPage from "./pages/ContactsPage.jsx";
import ConversationsPage from "./pages/ConversationsPage.jsx";
import { useAuth } from "./components/useAuth.js";

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={token ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="deals" element={<DealsPipelinePage />} />
        <Route path="deals/:dealId" element={<DealDetailsPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
    </Routes>
  );
}

