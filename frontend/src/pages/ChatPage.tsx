import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import { useChatStore, type Message } from "../store/useChatStore";
import { askQuestion, clearSessionOnServer, getSession } from "../services/chatService";
import { AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

const SESSION_KEY = "rag_session_id";
const RECENT_SESSIONS_KEY = "rag_recent_sessions";
const MAX_RECENT = 12;

interface SessionMeta {
  id: string;
  title: string;
  updatedAt: number;
}

function getOrCreateSessionId() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const newId = `session_${Date.now()}`;
  localStorage.setItem(SESSION_KEY, newId);
  return newId;
}

function makeFallbackTitle(sessionId: string) {
  return `Session ${sessionId.slice(-6)}`;
}

function makeSessionTitle(input: string) {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Untitled Session";
  return cleaned.length > 40 ? `${cleaned.slice(0, 40)}...` : cleaned;
}

function readRecentSessions(): SessionMeta[] {
  try {
    const raw = localStorage.getItem(RECENT_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    if (parsed.every((x) => typeof x === "string")) {
      return parsed.map((id: string, index: number) => ({
        id,
        title: makeFallbackTitle(id),
        updatedAt: Date.now() - index,
      }));
    }

    return parsed
      .filter((x) => x && typeof x.id === "string")
      .map((x) => ({
        id: x.id as string,
        title: typeof x.title === "string" && x.title.trim() ? x.title : makeFallbackTitle(x.id),
        updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

function writeRecentSessions(sessions: SessionMeta[]) {
  localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_RECENT)));
}

function ChatPage() {
  const [searchParams] = useSearchParams();
  const { messages, addMessage, setMessages, isLoading, setLoading, clearMessages } = useChatStore();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [recentSessions, setRecentSessions] = useState<SessionMeta[]>(() => readRecentSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => getOrCreateSessionId());
  const [typingText, setTypingText] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    let cancelled = false;
    const loadCurrentSession = async () => {
      try {
        const session = await getSession(currentSessionId);
        if (cancelled) return;
        if (!session.history.length) return;

        const restoredMessages: Message[] = [];
        for (const turn of session.history) {
          restoredMessages.push({
            id: crypto.randomUUID(),
            role: "user",
            content: turn.question,
            timestamp: new Date(),
          });
          restoredMessages.push({
            id: crypto.randomUUID(),
            role: "assistant",
            content: turn.answer,
            timestamp: new Date(),
          });
        }
        setMessages(restoredMessages);
        saveRecent(currentSessionId, makeSessionTitle(session.history[0].question));
      } catch {
        // Keep default welcome message when session is missing/unavailable.
      }
    };

    loadCurrentSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveRecent = (sessionId: string, title?: string) => {
    setRecentSessions((prev) => {
      const existing = prev.find((session) => session.id === sessionId);
      const nextSession: SessionMeta = {
        id: sessionId,
        title: title ?? existing?.title ?? makeFallbackTitle(sessionId),
        updatedAt: Date.now(),
      };
      const next = [nextSession, ...prev.filter((session) => session.id !== sessionId)].slice(0, MAX_RECENT);
      writeRecentSessions(next);
      return next;
    });
  };

  const handleSendMessage = async (content: string) => {
    addMessage({ role: "user", content });
    setLoading(true);
    setErrorMessage("");

    try {
      const cid = searchParams.get("course_id")?.trim() ?? "";
      const sid = searchParams.get("section_id")?.trim() ?? "";
      const result = await askQuestion({
        question: content,
        session_id: currentSessionId,
        top_k: 4,
        ...(cid ? { course_id: cid } : {}),
        ...(cid && sid ? { section_id: sid } : {}),
      });

      addMessage({
        role: "assistant",
        content: result.answer,
      });

      const currentMeta = recentSessions.find((session) => session.id === currentSessionId);
      const shouldSetTitle =
        !currentMeta ||
        currentMeta.title === "New Session" ||
        currentMeta.title.startsWith("Session ");
      saveRecent(currentSessionId, shouldSetTitle ? makeSessionTitle(content) : undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(`Failed to get response from backend: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    localStorage.setItem(SESSION_KEY, newSessionId);

    clearMessages();
    setErrorMessage("");
  };

  const handleOpenSession = async (sessionId: string) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const session = await getSession(sessionId);

      const loadedMessages: Message[] = [];
      for (const turn of session.history) {
        loadedMessages.push({
          id: crypto.randomUUID(),
          role: "user",
          content: turn.question,
          timestamp: new Date(),
        });
        loadedMessages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: turn.answer,
          timestamp: new Date(),
        });
      }

      setCurrentSessionId(sessionId);
      localStorage.setItem(SESSION_KEY, sessionId);

      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      } else {
        clearMessages();
      }

      const firstQuestion = session.history[0]?.question;
      saveRecent(sessionId, firstQuestion ? makeSessionTitle(firstQuestion) : undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(`Failed to load session: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const performDeleteSession = async (sessionId: string) => {
    try {
      await clearSessionOnServer(sessionId);
    } catch {
      // If backend session already missing, still clear local entry.
    }

    setRecentSessions((prev) => {
      const next = prev.filter((session) => session.id !== sessionId);
      writeRecentSessions(next);
      return next;
    });

    if (sessionId === currentSessionId) {
      const newSessionId = `session_${Date.now()}`;
      setCurrentSessionId(newSessionId);
      localStorage.setItem(SESSION_KEY, newSessionId);
      clearMessages();
      setErrorMessage("");
    }

    toast.success("Session deleted");
  };

  const handleDeleteSession = (sessionId: string) => {
    const targetSession = recentSessions.find((session) => session.id === sessionId);
    const toastId = `delete-session-${sessionId}`;
    if (toast.isActive(toastId)) return;

    toast(
      ({ closeToast }) => (
        <div className="text-sm">
          <p className="font-medium text-white">Delete "{targetSession?.title ?? "this session"}"?</p>
          <p className="text-xs text-zinc-300 mt-1">This action cannot be undone.</p>
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
      {
        toastId,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
      }
    );
  };

  return (
    <div className="flex h-screen bg-[#050505] text-foreground overflow-hidden dark">
      <Sidebar
        recentSessions={recentSessions}
        currentSessionId={currentSessionId}
        onNewSession={handleNewSession}
        onOpenSession={handleOpenSession}
        onDeleteSession={handleDeleteSession}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

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
                  isStreaming={true}
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
    </div>
  );
}

export default ChatPage;
