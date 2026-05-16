import { Link, useNavigate } from "react-router-dom";
import { useChatStore } from "../../store/useChatStore";
import { clearAuth, getStoredUser, isAdmin } from "../../lib/auth";
import { Bell, LayoutDashboard, LogOut, Menu, Moon, Share2, Sun, User, Zap } from "lucide-react";

const TopHeader = () => {
  const navigate = useNavigate();
  const { currentTopic, toggleSidebar } = useChatStore();
  const user = getStoredUser();

  return (
    <header className="h-16 md:h-20 glass border-b px-3 md:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2 md:gap-6 min-w-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl border border-white/10 bg-muted/30 hover:bg-muted/50 text-muted-foreground shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm leading-none truncate">Learning Assistant</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              Online &amp; Ready
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topic:</span>
          <span className="text-sm font-medium">{currentTopic}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {isAdmin() && (
          <Link
            to="/admin"
            className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-muted/20 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin
          </Link>
        )}
        <div className="hidden lg:flex items-center gap-1 mr-2">
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full" />
          </button>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-muted/30 border border-white/5">
          <button
            type="button"
            className="p-2 rounded-xl bg-background shadow-lg transition-all"
            aria-label="Dark mode"
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all"
            aria-label="Light mode"
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            clearAuth();
            navigate("/login");
          }}
          className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-4 py-1.5 rounded-2xl border border-white/10 bg-muted/30 hover:bg-muted/50 transition-all"
          title="Sign out"
        >
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
            {user?.email?.split("@")[0] ?? "Sign out"}
          </span>
          <LogOut className="w-4 h-4 hidden sm:block text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
