import { useChatStore } from "../../store/useChatStore";
import { cn } from "../../lib/utils";
import { isAdmin } from "../../lib/auth";
import { Link } from "react-router-dom";
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
  Shield,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

  const handleSelectSession = (sessionId: string) => {
    onOpenSession(sessionId);
    // Auto-close the drawer on mobile once the user picks a session.
    if (window.matchMedia("(max-width: 767px)").matches) {
      toggleSidebar();
    }
  };

  const handleNewSessionClick = () => {
    onNewSession();
    if (window.matchMedia("(max-width: 767px)").matches) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "h-screen glass border-r flex flex-col transition-[transform,width] duration-300 ease-in-out z-50",
          // Mobile: fixed overlay drawer that slides in from the left.
          "fixed md:relative inset-y-0 left-0",
          // Width: full 280px on mobile when open; on desktop, follow expanded/collapsed state.
          "w-[280px]",
          isSidebarOpen ? "md:w-[280px]" : "md:w-20",
          // Slide off-screen on mobile when closed; always visible on desktop.
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          !isSidebarOpen && "md:items-center"
        )}
      >
        <div className="p-4 md:p-6 flex items-center justify-between">
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

          {/* Mobile close button */}
          {isSidebarOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-lg hover:bg-muted/50 text-muted-foreground"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-3 md:px-4 mb-6 md:mb-8">
          <button
            onClick={handleNewSessionClick}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all ai-glow",
              !isSidebarOpen && "md:justify-center"
            )}
          >
            <Plus className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">New Session</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-4 space-y-6">
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
                    !isSidebarOpen && "md:justify-center"
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
                      onClick={() => handleSelectSession(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectSession(session.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left hover:bg-muted/50",
                        !isSidebarOpen && "md:justify-center",
                        session.id === currentSessionId && "bg-muted/40 border border-white/10"
                      )}
                      title={session.title}
                    >
                      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
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
                            className="opacity-100 md:opacity-0 md:group-hover/session:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
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

        {isAdmin() && (
          <div className="px-3 md:px-4 pb-3 md:pb-4">
            <Link
              to="/admin"
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-100 hover:bg-indigo-500/15 hover:border-indigo-500/35 transition-colors",
                !isSidebarOpen && "md:justify-center"
              )}
              title="Admin dashboard"
            >
              <Shield className="w-5 h-5 text-indigo-300 shrink-0" />
              {isSidebarOpen && <span className="text-sm font-medium">Admin dashboard</span>}
            </Link>
          </div>
        )}

        {/* Desktop-only collapse toggle */}
        <div className="hidden md:block p-4 border-t border-white/5">
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
              <ChevronRight className="w-5 h-5 mx-auto" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
