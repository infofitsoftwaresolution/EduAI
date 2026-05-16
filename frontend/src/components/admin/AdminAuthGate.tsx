import { useCallback, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLoginPage from "../../pages/AdminLoginPage";
import AdminCoursesList from "../../pages/admin/AdminCoursesList";
import AdminCourseWorkspace from "../../pages/admin/AdminCourseWorkspace";
import AdminSettingsPage from "../../pages/admin/AdminSettingsPage";
import { clearAdminSession, isAdminSession, setAdminSession } from "../../lib/adminAuth";

function AdminAuthGate() {
  const [authed, setAuthed] = useState(() => isAdminSession());

  const handleLoginSuccess = useCallback(() => {
    setAdminSession();
    setAuthed(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearAdminSession();
    setAuthed(false);
  }, []);

  if (!authed) {
    return <AdminLoginPage onSuccess={handleLoginSuccess} />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminCoursesList onLogout={handleLogout} />} />
      <Route path="/course/:courseId" element={<AdminCourseWorkspace onLogout={handleLogout} />} />
      <Route path="/settings" element={<AdminSettingsPage onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default AdminAuthGate;
