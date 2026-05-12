import { Navigate, Route, Routes } from "react-router-dom";
import AdminAuthGate from "./components/admin/AdminAuthGate";
import ChatPage from "./pages/ChatPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/admin" element={<AdminAuthGate />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
