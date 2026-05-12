import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../components/layout/AdminHeader";
import { cn } from "../lib/utils";
import {
  createCourse,
  createSection,
  deleteAsset,
  deleteCourse,
  deleteSection,
  fetchHealth,
  fetchRoot,
  getApiBaseUrl,
  ingestFileToSection,
  ingestUrlToSection,
  listAssets,
  listCourses,
  listSections,
  type Asset,
  type Course,
  type HealthCheckResult,
  type Section,
} from "../services/adminService";
import {
  Activity,
  BookMarked,
  FileUp,
  FolderPlus,
  Globe,
  Layers,
  Loader2,
  Server,
  Stethoscope,
  Trash2,
} from "lucide-react";

const ACCEPT = ".pdf,.docx,.txt";

interface AdminPageProps {
  onLogout: () => void;
}

function AdminPage({ onLogout }: AdminPageProps) {
  const apiBase = getApiBaseUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [url, setUrl] = useState("");

  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [rootPayload, setRootPayload] = useState<Record<string, unknown> | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mutating, setMutating] = useState(false);

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const data = await listCourses();
      setCourses(data);
      setSelectedCourseId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (!selectedCourseId) {
      setSections([]);
      setSelectedSectionId(null);
      return;
    }
    let cancelled = false;
    setSectionsLoading(true);
    void listSections(selectedCourseId)
      .then((data) => {
        if (cancelled) return;
        setSections(data);
        setSelectedSectionId((prev) => {
          if (prev && data.some((s) => s.id === prev)) return prev;
          return data[0]?.id ?? null;
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load sections");
      })
      .finally(() => {
        if (!cancelled) setSectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId || !selectedSectionId) {
      setAssets([]);
      return;
    }
    let cancelled = false;
    setAssetsLoading(true);
    void listAssets(selectedCourseId, selectedSectionId)
      .then((data) => {
        if (!cancelled) setAssets(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load assets");
      })
      .finally(() => {
        if (!cancelled) setAssetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, selectedSectionId]);

  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    setHealth(null);
    setRootPayload(null);
    try {
      const [h, root] = await Promise.all([fetchHealth(), fetchRoot()]);
      setHealth(h);
      setRootPayload(root);
      toast.success("Health check completed — API is reachable.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newCourseTitle.trim();
    if (!t) return;
    setMutating(true);
    try {
      await createCourse(t);
      setNewCourseTitle("");
      toast.success("Course created.");
      await loadCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setMutating(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    const t = newSectionTitle.trim();
    if (!t) return;
    setMutating(true);
    try {
      await createSection(selectedCourseId, t);
      setNewSectionTitle("");
      toast.success("Section created.");
      const data = await listSections(selectedCourseId);
      setSections(data);
      setSelectedSectionId(data[data.length - 1]?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create section");
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourseId) return;
    if (!window.confirm("Delete this course and all its sections, files, and vectors?")) return;
    setMutating(true);
    try {
      await deleteCourse(selectedCourseId);
      toast.success("Course deleted.");
      setSelectedSectionId(null);
      await loadCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete course");
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedCourseId || !selectedSectionId) return;
    if (!window.confirm("Delete this section and all assets in it from the knowledge base?")) return;
    setMutating(true);
    try {
      await deleteSection(selectedCourseId, selectedSectionId);
      toast.success("Section deleted.");
      const data = await listSections(selectedCourseId);
      setSections(data);
      setSelectedSectionId(data[0]?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete section");
    } finally {
      setMutating(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !selectedCourseId || !selectedSectionId) {
      if (!selectedSectionId) toast.error("Select a course and section first.");
      return;
    }
    setUploadLoading(true);
    try {
      const res = await ingestFileToSection(selectedCourseId, selectedSectionId, file);
      toast.success(`File uploaded — ${res.chunks_added} chunks added.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAssets(await listAssets(selectedCourseId, selectedSectionId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  };

  const onUrlSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Paste a valid URL first.");
      return;
    }
    if (!selectedCourseId || !selectedSectionId) {
      toast.error("Select a course and section first.");
      return;
    }
    setUrlLoading(true);
    try {
      const res = await ingestUrlToSection(selectedCourseId, selectedSectionId, trimmed);
      toast.success(`URL ingested — ${res.chunks_added} chunks added.`);
      setUrl("");
      setAssets(await listAssets(selectedCourseId, selectedSectionId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "URL ingest failed");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!selectedCourseId || !selectedSectionId) return;
    if (!window.confirm("Remove this asset from the knowledge base?")) return;
    setMutating(true);
    try {
      await deleteAsset(selectedCourseId, selectedSectionId, assetId);
      toast.success("Asset removed.");
      setAssets(await listAssets(selectedCourseId, selectedSectionId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-foreground overflow-hidden dark flex-col">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <AdminHeader
        onLogout={() => {
          onLogout();
          toast.info("Signed out of admin.");
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-xs rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-indigo-200">
            API base: <span className="font-mono font-semibold break-all">{apiBase}</span>
          </div>

          <section className="rounded-2xl glass-card border-white/10 p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">System health</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifies <span className="font-mono text-indigo-200/90">/health</span> and the API root.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void runHealthCheck()}
                disabled={healthLoading}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ai-glow shrink-0",
                  healthLoading
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:opacity-90"
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
                    Check health
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

          <section className="rounded-2xl glass-card border-white/10 p-5 md:p-6 space-y-5">
            <div className="flex gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                <BookMarked className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-base">Courses and sections</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick a course and section, then upload files or URLs into that section. Vectors are tagged for
                  scoped chat.
                </p>
              </div>
            </div>

            <form onSubmit={(e) => void handleCreateCourse(e)} className="flex flex-col sm:flex-row gap-2">
              <input
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="New course title"
                className="flex-1 rounded-xl border border-white/10 bg-background/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                disabled={mutating}
              />
              <button
                type="submit"
                disabled={mutating || !newCourseTitle.trim()}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
                  mutating || !newCourseTitle.trim()
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:opacity-90 ai-glow"
                )}
              >
                <FolderPlus className="w-4 h-4" />
                Add course
              </button>
            </form>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Course
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={selectedCourseId ?? ""}
                  onChange={(e) => setSelectedCourseId(e.target.value || null)}
                  disabled={coursesLoading || courses.length === 0}
                >
                  {courses.length === 0 ? (
                    <option value="">No courses yet</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
                {selectedCourseId && (
                  <p className="mt-1 text-[10px] font-mono text-muted-foreground break-all">id: {selectedCourseId}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Section
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 bg-background/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={selectedSectionId ?? ""}
                  onChange={(e) => setSelectedSectionId(e.target.value || null)}
                  disabled={sectionsLoading || !selectedCourseId || sections.length === 0}
                >
                  {sections.length === 0 ? (
                    <option value="">{selectedCourseId ? "No sections — add one" : "—"}</option>
                  ) : (
                    sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))
                  )}
                </select>
                {selectedSectionId && (
                  <p className="mt-1 text-[10px] font-mono text-muted-foreground break-all">id: {selectedSectionId}</p>
                )}
              </div>
            </div>

            <form onSubmit={(e) => void handleCreateSection(e)} className="flex flex-col sm:flex-row gap-2">
              <input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="New section title (module / week)"
                className="flex-1 rounded-xl border border-white/10 bg-background/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                disabled={mutating || !selectedCourseId}
              />
              <button
                type="submit"
                disabled={mutating || !selectedCourseId || !newSectionTitle.trim()}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
                  mutating || !selectedCourseId || !newSectionTitle.trim()
                    ? "bg-muted text-muted-foreground"
                    : "border border-indigo-500/30 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
                )}
              >
                <Layers className="w-4 h-4" />
                Add section
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={mutating || !selectedCourseId}
                onClick={() => void handleDeleteCourse()}
                className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 hover:bg-red-500/20 disabled:opacity-40"
              >
                Delete entire course
              </button>
              <button
                type="button"
                disabled={mutating || !selectedCourseId || !selectedSectionId}
                onClick={() => void handleDeleteSection()}
                className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 hover:bg-red-500/20 disabled:opacity-40"
              >
                Delete this section
              </button>
            </div>
          </section>

          <section className="rounded-2xl glass-card border-white/10 p-5 md:p-6">
            <div className="flex gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                <FileUp className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Upload to section</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, DOCX, or TXT. Requires a selected course and section above.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(ev) => void handleFile(ev.target.files?.[0])}
            />

            <button
              type="button"
              disabled={uploadLoading || !selectedSectionId}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "w-full rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all",
                dragActive
                  ? "border-indigo-400/60 bg-indigo-500/10"
                  : "border-white/15 hover:border-indigo-500/35 hover:bg-muted/20",
                (uploadLoading || !selectedSectionId) && "opacity-60 pointer-events-none"
              )}
            >
              {uploadLoading ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading and indexing…
                </span>
              ) : (
                <>
                  <FileUp className="w-8 h-8 mx-auto text-indigo-400/80 mb-3" />
                  <p className="text-sm font-medium">Drop a file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">PDF · DOCX · TXT</p>
                </>
              )}
            </button>
          </section>

          <section className="rounded-2xl glass-card border-white/10 p-5 md:p-6">
            <div className="flex gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Ingest URL into section</h2>
                <p className="text-sm text-muted-foreground mt-1">Public pages only; same scope as file uploads.</p>
              </div>
            </div>

            <form onSubmit={(e) => void onUrlSubmit(e)} className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/docs/intro"
                className="flex-1 rounded-xl border border-white/10 bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-muted-foreground/50"
                disabled={urlLoading || !selectedSectionId}
              />
              <button
                type="submit"
                disabled={urlLoading || !url.trim() || !selectedSectionId}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all sm:w-40",
                  urlLoading || !url.trim() || !selectedSectionId
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:opacity-90 ai-glow"
                )}
              >
                {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingest URL"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl glass-card border-white/10 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-semibold text-sm">Assets in this section</h3>
              {assetsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {!selectedSectionId ? (
              <p className="text-sm text-muted-foreground">Select a section to list assets.</p>
            ) : assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet. Upload a file or URL above.</p>
            ) : (
              <ul className="space-y-2">
                {assets.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {a.source_type} · {a.chunks_count} chunks · {a.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Remove from knowledge base"
                      disabled={mutating}
                      onClick={() => void handleDeleteAsset(a.id)}
                      className="p-2 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-300 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-muted/10 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Tips</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                From your LMS, open the assistant with{" "}
                <span className="font-mono text-indigo-200/90">?course_id=…&section_id=…</span> on the chat URL so
                students never type UUIDs. Or call <span className="font-mono">POST /ask</span> with those fields from
                the server.
              </li>
              <li>Large pages may take longer to fetch and embed.</li>
              <li>
                OpenAPI: <span className="font-mono text-indigo-200/90">{apiBase}/docs</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
