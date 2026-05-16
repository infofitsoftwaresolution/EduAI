import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2, Lock, Mail, UserPlus, LogIn } from "lucide-react";
import { cn } from "../lib/utils";
import { login, register } from "../services/authService";
import { isAdmin } from "../lib/auth";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Signed in.");
      } else {
        await register(email, password);
        toast.success("Account created.");
      }
      if (isAdmin()) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-foreground dark flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <header className="relative z-10 h-16 glass border-b px-4 flex items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-muted/20 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <h1 className="text-center text-xl font-bold">Student sign in</h1>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Your chats are saved to your account and restore after refresh.
          </p>

          <div className="mt-6 flex rounded-xl border border-white/10 p-1 bg-muted/20">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "flex-1 py-2 text-sm rounded-lg transition-colors",
                mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={cn(
                "flex-1 py-2 text-sm rounded-lg transition-colors",
                mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              Register
            </button>
          </div>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-4 rounded-2xl glass-card border-white/10 p-6 space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-background/50 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Password</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-background/50 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  disabled={submitting}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 ai-glow disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign in
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Admin?{" "}
            <Link to="/admin" className="text-indigo-400 hover:underline">
              Admin sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
