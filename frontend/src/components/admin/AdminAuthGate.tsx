import { useCallback, useState } from "react";
import AdminLoginPage from "../../pages/AdminLoginPage";
import AdminPage from "../../pages/AdminPage";
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

  return <AdminPage onLogout={handleLogout} />;
}

export default AdminAuthGate;
