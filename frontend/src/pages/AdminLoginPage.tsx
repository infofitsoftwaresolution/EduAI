import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2, Lock, Mail, Shield } from "lucide-react";
import { cn } from "../lib/utils";
import { login } from "../services/authService";
import { isAdmin } from "../lib/auth";

interface AdminLoginPageProps {
  onSuccess: () => void;
}

function AdminLoginPage({ onSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await login(email, password);
      if (!isAdmin()) {
        toast.error("This account is not an admin.");
        return;
      }
      onSuccess();
      toast.success("Signed in to admin console.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-foreground dark flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="relative z-10 h-16 md:h-20 glass border-b px-3 md:px-8 flex items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-muted/20 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to assistant</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ai-glow">
              <Shield className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
          </div>
          <h1 className="text-center text-xl font-bold tracking-tight">Admin sign-in</h1>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Use your admin account (seeded from server <span className="font-mono text-xs">ADMIN_EMAIL</span>).
          </p>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-6 md:mt-8 rounded-2xl glass-card border-white/10 p-5 sm:p-6 md:p-8 space-y-5"
          >
            <div>
              <label htmlFor="admin-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-background/50 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="admin@eduai.local"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-background/50 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ai-glow",
                submitting
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AdminLoginPage;
