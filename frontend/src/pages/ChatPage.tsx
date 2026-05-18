import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import { useChatStore, type Message } from "../store/useChatStore";
import {
  askQuestion,
  createChatSession,
  deleteChatSession,
  getSessionDetail,
  listChatSessions,
  type ChatSessionMeta,
} from "../services/chatService";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { notifyError, notifySuccess } from "../lib/notify";
import ChatPageSkeleton from "../components/chat/ChatPageSkeleton";

const ACTIVE_SESSION_KEY = "rag_active_session_id";

interface SessionMeta {
  id: string;
  title: string;
  updatedAt: number;
}

function sessionToMeta(s: ChatSessionMeta): SessionMeta {
  return {
    id: s.id,
    title: s.title,
    updatedAt: new Date(s.updated_at).getTime(),
  };
}

function messagesFromDetail(messages: { id: string; role: string; content: string; created_at: string }[]): Message[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    timestamp: new Date(m.created_at),
  }));
}

function getWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    content: "Hello! I'm your AI learning assistant. Ask me anything from your uploaded knowledge base.",
    timestamp: new Date(),
  };
}

function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { messages, addMessage, setMessages, isLoading, setLoading, clearMessages } = useChatStore();
  const [errorMessage, setErrorMessage] = useState("");
  const [recentSessions, setRecentSessions] = useState<SessionMeta[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [typingText, setTypingText] = useState("");
  const [bootstrapping, setBootstrapping] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const courseId = searchParams.get("course_id")?.trim() ?? "";
  const sectionId = searchParams.get("section_id")?.trim() ?? "";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);

  useEffect(() => {
    if (!isLoading) {
      setTypingText("");
      return;
    }
    const frames = ["Thinking", "Thinking.", "Thinking..", "Thinking..."];
    let idx = 0;
    setTypingText(frames[idx]);
    const timer = window.setInterval(() => {
      idx = (idx + 1) % frames.length;
      setTypingText(frames[idx]);
    }, 350);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  const refreshSessionList = useCallback(async () => {
    const list = await listChatSessions();
    setRecentSessions(list.map(sessionToMeta));
    return list;
  }, []);

  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      const detail = await getSessionDetail(sessionId);
      if (detail.messages.length === 0) {
        setMessages([getWelcomeMessage()]);
      } else {
        setMessages(messagesFromDetail(detail.messages));
      }
    },
    [setMessages]
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setBootstrapping(true);
      try {
        const list = await refreshSessionList();
        const savedId = localStorage.getItem(ACTIVE_SESSION_KEY);
        let activeId = savedId && list.some((s) => s.id === savedId) ? savedId : list[0]?.id;

        if (!activeId) {
          const created = await createChatSession({
            course_id: courseId || undefined,
            section_id: sectionId || undefined,
          });
          activeId = created.id;
          await refreshSessionList();
        }

        if (cancelled) return;
        setCurrentSessionId(activeId);
        localStorage.setItem(ACTIVE_SESSION_KEY, activeId);
        await loadSessionMessages(activeId);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load chats";
          if (msg.includes("401") || msg.toLowerCase().includes("authenticated")) {
            navigate("/login", { replace: true });
          } else {
            setErrorMessage(msg);
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [courseId, sectionId, loadSessionMessages, navigate, refreshSessionList]);

  const handleSendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !currentSessionId || isLoading) return;

    addMessage({ role: "user", content: trimmed });
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await askQuestion({
        question: trimmed,
        session_id: currentSessionId,
        top_k: 4,
        ...(courseId ? { course_id: courseId } : {}),
        ...(courseId && sectionId ? { section_id: sectionId } : {}),
      });

      addMessage({ role: "assistant", content: result.answer });
      await refreshSessionList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(`Failed to get response: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    setLoading(true);
    try {
      const created = await createChatSession({
        course_id: courseId || undefined,
        section_id: sectionId || undefined,
      });
      setCurrentSessionId(created.id);
      localStorage.setItem(ACTIVE_SESSION_KEY, created.id);
      clearMessages();
      setErrorMessage("");
      await refreshSessionList();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Could not create chat");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (sessionId: string) => {
    setLoading(true);
    setErrorMessage("");
    try {
      await loadSessionMessages(sessionId);
      setCurrentSessionId(sessionId);
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const performDeleteSession = async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
    } catch {
      /* may already be gone */
    }

    const list = await refreshSessionList();

    if (sessionId === currentSessionId) {
      const next = list[0];
      if (next) {
        setCurrentSessionId(next.id);
        localStorage.setItem(ACTIVE_SESSION_KEY, next.id);
        await loadSessionMessages(next.id);
      } else {
        const created = await createChatSession({
          course_id: courseId || undefined,
          section_id: sectionId || undefined,
        });
        setCurrentSessionId(created.id);
        localStorage.setItem(ACTIVE_SESSION_KEY, created.id);
        clearMessages();
        await refreshSessionList();
      }
    }

    notifySuccess("Chat deleted");
  };

  const handleDeleteSession = (sessionId: string) => {
    const targetSession = recentSessions.find((s) => s.id === sessionId);
    const toastId = `delete-session-${sessionId}`;
    if (toast.isActive(toastId)) return;

    toast(
      ({ closeToast }) => (
        <div className="text-sm">
          <p className="font-medium text-white">Delete "{targetSession?.title ?? "this chat"}"?</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-xs text-white"
              onClick={() => closeToast?.()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-xs text-white"
              onClick={() => {
                closeToast?.();
                void performDeleteSession(sessionId);
              }}
            >
              Delete
            </button>
          </div>
          </div>
      ),
      { toastId, autoClose: false, closeOnClick: false, closeButton: false }
    );
  };

  if (bootstrapping) {
    return <ChatPageSkeleton />;
  }

  return (
    <motion.div
      className="flex h-screen bg-[#050505] text-foreground overflow-hidden dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar
        recentSessions={recentSessions}
        currentSessionId={currentSessionId ?? ""}
        onNewSession={() => void handleNewSession()}
        onOpenSession={(id) => void handleOpenSession(id)}
        onDeleteSession={handleDeleteSession}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        <TopHeader />
        <div className="flex-1 overflow-y-auto px-3 md:px-12 py-4 md:py-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <ChatMessage
                  key="assistant-typing"
                  isStreaming
                  message={{
                    id: "assistant-typing",
                    role: "assistant",
                    content: typingText || "Thinking...",
                    timestamp: new Date(),
                  }}
                />
              )}
            </AnimatePresence>
            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </main>
    </motion.div>
  );
}

export default ChatPage;
