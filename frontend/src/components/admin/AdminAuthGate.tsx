import { Navigate, Route, Routes } from "react-router-dom";
import AdminCoursesList from "../../pages/admin/AdminCoursesList";
import AdminCourseWorkspace from "../../pages/admin/AdminCourseWorkspace";
import AdminSettingsPage from "../../pages/admin/AdminSettingsPage";
import { clearAdminSession, isAdminSession } from "../../lib/adminAuth";

interface AdminAuthGateProps {
  onLogout: () => void;
}

function AdminRoutes({ onLogout }: AdminAuthGateProps) {
  return (
    <Routes>
      <Route path="/" element={<AdminCoursesList onLogout={onLogout} />} />
      <Route path="/course/:courseId" element={<AdminCourseWorkspace onLogout={onLogout} />} />
      <Route path="/settings" element={<AdminSettingsPage onLogout={onLogout} />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function AdminAuthGate() {
  if (!isAdminSession()) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearAdminSession();
    window.location.href = "/login";
  };

  return <AdminRoutes onLogout={handleLogout} />;
}

export default AdminAuthGate;
