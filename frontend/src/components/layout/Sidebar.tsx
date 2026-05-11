import { useChatStore } from "../../store/useChatStore";
import { cn } from "../../lib/utils";
import {
  MessageSquare,
  History,
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  Code,
  Terminal,
  Trophy,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SessionMeta {
  id: string;
  title: string;
  updatedAt: number;
}

interface SidebarProps {
  recentSessions: SessionMeta[];
  currentSessionId: string;
  onNewSession: () => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

const Sidebar = ({
  recentSessions,
  currentSessionId,
  onNewSession,
  onOpenSession,
  onDeleteSession,
}: SidebarProps) => {
  const { isSidebarOpen, toggleSidebar } = useChatStore();

  const categories = [
    { name: "Web Development", icon: Code, color: "text-blue-400" },
    { name: "Systems Design", icon: BookOpen, color: "text-purple-400" },
    { name: "DevOps & Cloud", icon: Terminal, color: "text-emerald-400" },
    { name: "Interview Prep", icon: Trophy, color: "text-amber-400" },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 280 : 80 }}
      className={cn(
        "relative h-screen glass border-r flex flex-col transition-all duration-300 z-50",
        !isSidebarOpen && "items-center"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {isSidebarOpen ? (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ai-glow">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight ai-gradient-text">EduAI</span>
            </motion.div>
          ) : (
            <div
              key="logo-mini"
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ai-glow"
            >
              <Terminal className="w-6 h-6 text-white" />
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 mb-8">
        <button
          onClick={onNewSession}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all ai-glow",
            !isSidebarOpen && "justify-center"
          )}
        >
          <Plus className="w-5 h-5" />
          {isSidebarOpen && <span className="font-medium">New Session</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        <div>
          {isSidebarOpen && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 ml-2">
              Learning Path
            </h3>
          )}
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <cat.icon className={cn("w-5 h-5", cat.color)} />
                {isSidebarOpen && <span className="text-sm font-medium">{cat.name}</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          {isSidebarOpen && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 ml-2 flex items-center gap-2">
              <History className="w-3 h-3" /> Recent Sessions
            </h3>
          )}
          <div className="space-y-1">
            {recentSessions.length === 0 && isSidebarOpen ? (
              <div className="text-xs text-muted-foreground px-3 py-2">No recent sessions yet</div>
            ) : (
              recentSessions.map((session) => (
                <div key={session.id} className="group/session">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenSession(session.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenSession(session.id);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left hover:bg-muted/50",
                      !isSidebarOpen && "justify-center",
                      session.id === currentSessionId && "bg-muted/40 border border-white/10"
                    )}
                    title={session.title}
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    {isSidebarOpen && (
                      <>
                        <span className="text-sm text-muted-foreground truncate flex-1">{session.title}</span>
                        <button
                          type="button"
                          title="Delete session"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover/session:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
        >
          {isSidebarOpen ? (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse Sidebar</span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;