import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageMotion } from "../../components/ui/PageMotion";
import { cn } from "../../lib/utils";
import {
  fetchHealth,
  fetchRoot,
  getApiBaseUrl,
  type HealthCheckResult,
} from "../../services/adminService";
import { Activity, Loader2, Server, Stethoscope } from "lucide-react";

interface AdminSettingsPageProps {
  onLogout: () => void;
}

function AdminSettingsPage({ onLogout }: AdminSettingsPageProps) {
  const apiBase = getApiBaseUrl();
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [rootPayload, setRootPayload] = useState<Record<string, unknown> | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    setHealth(null);
    setRootPayload(null);
    try {
      const [h, root] = await Promise.all([fetchHealth(), fetchRoot()]);
      setHealth(h);
      setRootPayload(root);
      toast.success("API is reachable.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Health check failed");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  return (
    <AdminLayout
      onLogout={onLogout}
      title="Settings"
      subtitle="System checks and API configuration"
      backTo="/admin"
      backLabel="Courses"
    >
      <PageMotion className="max-w-2xl mx-auto space-y-6">
        <section className="rounded-2xl glass-card border-white/10 p-5 sm:p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">API base URL</p>
          <p className="mt-2 font-mono text-sm text-indigo-200/90 break-all">{apiBase}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Set via <span className="font-mono">VITE_API_BASE_URL</span> in frontend env.
          </p>
        </section>

        <section className="rounded-2xl glass-card border-white/10 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold">System health</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Checks <span className="font-mono text-indigo-200/80">/health</span> and API root.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void runHealthCheck()}
              disabled={healthLoading}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shrink-0",
                healthLoading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90 ai-glow"
              )}
            >
              {healthLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Run check
                </>
              )}
            </button>
          </div>

          {(health || rootPayload) && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {health && (
                <div className="rounded-xl border border-white/10 bg-background/40 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    /health
                  </p>
                  <p className="mt-2 text-lg font-semibold text-emerald-400 capitalize">{health.status}</p>
                  <p className="text-xs text-muted-foreground mt-1">Latency ~{health.latencyMs} ms</p>
                </div>
              )}
              {rootPayload && (
                <div className="rounded-xl border border-white/10 bg-background/40 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <Server className="w-3 h-3" /> Root
                  </p>
                  <pre className="mt-2 text-xs font-mono text-indigo-100/90 whitespace-pre-wrap break-all">
                    {JSON.stringify(rootPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground text-center">
          OpenAPI docs:{" "}
          <a
            href={`${apiBase}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline font-mono"
          >
            {apiBase}/docs
          </a>
        </p>
      </PageMotion>
    </AdminLayout>
  );
}

export default AdminSettingsPage;
