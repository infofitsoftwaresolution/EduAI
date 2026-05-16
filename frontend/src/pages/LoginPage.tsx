import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notifyError, notifySuccess } from "../lib/notify";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Mail, Sparkles, UserPlus, LogIn } from "lucide-react";
import { cn } from "../lib/utils";
import { login, register } from "../services/authService";
import { isAdmin, isAuthenticated } from "../lib/auth";
import { FadeIn, PageMotion } from "../components/ui/PageMotion";

const slideVariants = {
  enter: (d: number) => ({ opacity: 0, x: d * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -48 }),
};

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [slideDirection, setSlideDirection] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: "login" | "register") => {
    if (next === mode) return;
    setSlideDirection(next === "register" ? 1 : -1);
    setMode(next);
  };

  useEffect(() => {
    if (!isAuthenticated()) return;
    navigate(isAdmin() ? "/admin" : "/", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        notifySuccess("Welcome back!");
      } else {
        await register(email, password);
        notifySuccess("Account created successfully.");
      }
      navigate(isAdmin() ? "/admin" : "/", { replace: true });
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="min-h-screen bg-[#030303] text-foreground flex relative overflow-hidden">
      <motion.div
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[100px]"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-16 xl:px-24 border-r border-white/5">
        <FadeIn>
          <motion.div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ai-glow">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold ai-gradient-text">EduAI</span>
          </motion.div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Learn smarter with
            <br />
            <span className="ai-gradient-text">your course AI</span>
          </h1>
          <p className="mt-5 text-muted-foreground text-lg max-w-md leading-relaxed">
            Ask questions from your uploaded materials. Chats are saved to your account and sync across sessions.
          </p>
          <ul className="mt-10 space-y-3 text-sm text-muted-foreground">
            {["Course-scoped answers with sources", "Persistent chat history", "Secure student accounts"].map(
              (item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {item}
                </motion.li>
              )
            )}
          </ul>
        </FadeIn>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <PageMotion className="w-full max-w-[420px]">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ai-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="relative flex p-1 rounded-xl bg-white/5 border border-white/10 mb-6">
            <motion.div
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-lg"
              animate={{ x: mode === "login" ? 0 : "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              aria-hidden
            />
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchMode(tab)}
                className={cn(
                  "relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200",
                  mode === tab ? "text-black" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <motion.div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={mode}
                custom={slideDirection}
                initial="enter"
                animate="center"
                exit="exit"
                variants={slideVariants}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="text-center lg:text-left mb-8">
                  <h2 className="text-2xl font-bold">
                    {mode === "login" ? "Sign in" : "Create account"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {mode === "login"
                      ? "Use your email and password. Admins are routed to the dashboard automatically."
                      : "Register as a student to start learning with EduAI."}
                  </p>
                </div>

                <form
                  onSubmit={(e) => void handleSubmit(e)}
                  className="rounded-2xl border border-white/10 bg-card/30 backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-black/40"
                >
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@university.edu"
                        className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                      Password
                    </label>
                    <motion.div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="password"
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        disabled={submitting}
                      />
                    </motion.div>
                    <AnimatePresence>
                      {mode === "register" && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] text-muted-foreground overflow-hidden"
                        >
                          Minimum 6 characters
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-95 ai-glow disabled:opacity-50 transition-opacity"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : mode === "login" ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        Continue
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Create account
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </PageMotion>
      </div>
    </motion.div>
  );
}

export default LoginPage;
