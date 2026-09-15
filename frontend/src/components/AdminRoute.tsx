import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";
import ErrorMessage from "./ErrorMessage";

export default function AdminRoute() {
  const { user, isLoading, authError, retryAuth } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return <Loading />;
  }

  if (authError) {
    return <ErrorMessage message={t("common.authError")} onRetry={retryAuth} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/courses" replace />;
  }

  return <Outlet />;
}
