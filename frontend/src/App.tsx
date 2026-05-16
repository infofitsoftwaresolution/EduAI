import { Navigate, Route, Routes } from "react-router-dom";
import AdminAuthGate from "./components/admin/AdminAuthGate";
import ChatAuthGate from "./components/chat/ChatAuthGate";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ChatAuthGate />} />
      <Route path="/admin/*" element={<AdminAuthGate />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
