import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { useAuth } from "./components/useAuth.js";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import AuditLogPage from "./pages/AuditLogPage.jsx";
import ContactsPage from "./pages/ContactsPage.jsx";
import ConversationsPage from "./pages/ConversationsPage.jsx";
import CsvPage from "./pages/CsvPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DealDetailsPage from "./pages/DealDetailsPage.jsx";
import DealsPipelinePage from "./pages/DealsPipelinePage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RemindersPage from "./pages/RemindersPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/auth/callback"  element={<AuthCallbackPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected — inside Layout shell */}
      <Route
        path="/"
        element={token ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route index                    element={<DashboardPage />} />
        <Route path="dashboard"         element={<DashboardPage />} />
        <Route path="deals"             element={<DealsPipelinePage />} />
        <Route path="deals/:dealId"     element={<DealDetailsPage />} />
        <Route path="contacts"          element={<ContactsPage />} />
        <Route path="timeline"          element={<TimelinePage />} />
        <Route path="reminders"         element={<RemindersPage />} />
        <Route path="conversations"     element={<ConversationsPage />} />
        <Route path="csv"               element={<CsvPage />} />
        <Route path="audit"             element={<AuditLogPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
    </Routes>
  );
}
