import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import AdminAuthGate from "./components/admin/AdminAuthGate";
import ChatAuthGate from "./components/chat/ChatAuthGate";
import LoginPage from "./pages/LoginPage";

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ChatAuthGate />} />
        <Route path="/admin/*" element={<AdminAuthGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
