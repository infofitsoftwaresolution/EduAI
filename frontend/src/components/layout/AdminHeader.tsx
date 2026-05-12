import { Link } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, LogOut, Shield } from "lucide-react";

interface AdminHeaderProps {
  onLogout?: () => void;
}

const AdminHeader = ({ onLogout }: AdminHeaderProps) => {
  return (
    <header className="h-20 glass border-b px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-muted/20 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Assistant</span>
        </Link>

        <div className="h-8 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ai-glow shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-indigo-400 hidden sm:block shrink-0" />
              <h1 className="font-bold text-sm md:text-base leading-tight truncate">Admin console</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Knowledge base and system checks
            </p>
          </div>
        </div>
      </div>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-muted/20 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-200 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      )}
    </header>
  );
};

export default AdminHeader;
