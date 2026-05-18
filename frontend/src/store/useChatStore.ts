import { create } from "zustand";
import { createId } from "../lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "code" | "terminal" | "quiz" | "alert";
  metadata?: any;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isSidebarOpen: boolean;
  currentTopic: string;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  clearMessages: () => void;
}

const getWelcomeMessage = (): Message => ({
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your AI learning assistant. Ask me anything from your uploaded knowledge base.",
  timestamp: new Date(),
});

// On mobile we start with the drawer closed so it doesn't cover the chat on first paint.
const getInitialSidebarOpen = (): boolean => {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 768px)").matches;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [getWelcomeMessage()],
  isLoading: false,
  isSidebarOpen: getInitialSidebarOpen(),
  currentTopic: "General Learning",
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: createId(),
          timestamp: new Date(),
        },
      ],
    })),
  setMessages: (messages) => set({ messages }),
  setLoading: (loading) => set({ isLoading: loading }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  clearMessages: () => set({ messages: [getWelcomeMessage()] }),
}));