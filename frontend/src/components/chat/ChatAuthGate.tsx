import { Navigate } from "react-router-dom";
import { isAdmin, isAuthenticated } from "../../lib/auth";
import ChatPage from "../../pages/ChatPage";

function ChatAuthGate() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (isAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  return <ChatPage />;
}

export default ChatAuthGate;
