import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../../lib/auth";
import ChatPage from "../../pages/ChatPage";

function ChatAuthGate() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <ChatPage />;
}

export default ChatAuthGate;
