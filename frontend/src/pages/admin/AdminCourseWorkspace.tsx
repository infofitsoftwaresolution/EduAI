import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notifyError, notifySuccess } from "../../lib/notify";
import AdminLayout from "../../components/admin/AdminLayout";
import AssetStatusBadge, { assetStatusClass } from "../../components/admin/AssetStatusBadge";
import { cn } from "../../lib/utils";
import {
  createSection,
  deleteAsset,
  deleteCourse,
  deleteSection,
  getCourse,
  ingestFileToSection,
  ingestUrlToSection,
  listAssets,
  type Asset,
  type Section,
} from "../../services/adminService";
import { PageMotion } from "../../components/ui/PageMotion";
import {
  ExternalLink,
  FileUp,
  Globe,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";

const ACCEPT = ".pdf,.docx,.txt";

interface AdminCourseWorkspaceProps {
  onLogout: () => void;
}

function AdminCourseWorkspace({ onLogout }: AdminCourseWorkspaceProps) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [url, setUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await getCourse(courseId);
      setCourseTitle(data.course.title);
      setSections(data.sections);
      setSelectedSectionId((prev) => {
        if (prev && data.sections.some((s) => s.id === prev)) return prev;
        return data.sections[0]?.id ?? null;
      });
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load course");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  const loadAssets = useCallback(async () => {
    if (!courseId || !selectedSectionId) {
      setAssets([]);
      return;
    }
    setAssetsLoading(true);
    try {
      setAssets(await listAssets(courseId, selectedSectionId));
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setAssetsLoading(false);
    }
  }, [courseId, selectedSectionId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    const title = newModuleTitle.trim();
    if (!title) return;
    setMutating(true);
    try {
      const sec = await createSection(courseId, title, sections.length);
      setNewModuleTitle("");
      notifySuccess("Module added.");
      const data = await getCourse(courseId);
      setSections(data.sections);
      setSelectedSectionId(sec.id);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Failed to add module");
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;
    if (!window.confirm(`Delete "${courseTitle}" and all its content? This cannot be undone.`)) return;
    setMutating(true);
    try {
      await deleteCourse(courseId);
      notifySuccess("Course deleted.");
      navigate("/admin");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Failed to delete course");
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteModule = async (sectionId: string) => {
    if (!courseId) return;
    const mod = sections.find((s) => s.id === sectionId);
    if (!window.confirm(`Delete module "${mod?.title}" and all its files?`)) return;
    setMutating(true);
    try {
      await deleteSection(courseId, sectionId);
      notifySuccess("Module deleted.");
      await loadCourse();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Failed to delete module");
    } finally {
      setMutating(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !courseId || !selectedSectionId) {
      notifyError("Select a module first.");
      return;
    }
    setUploadLoading(true);
    try {
      const res = await ingestFileToSection(courseId, selectedSectionId, file);
      notifySuccess(`Uploaded — ${res.chunks_added} chunks indexed.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAssets();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Upload failed");
      await loadAssets();
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || !courseId || !selectedSectionId) return;
    setUrlLoading(true);
    try {
      const res = await ingestUrlToSection(courseId, selectedSectionId, trimmed);
      notifySuccess(`Link added — ${res.chunks_added} chunks indexed.`);
      setUrl("");
      await loadAssets();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "URL ingest failed");
      await loadAssets();
    } finally {
      setUrlLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!courseId || !selectedSectionId) return;
    if (!window.confirm("Remove this file from the knowledge base?")) return;
    setMutating(true);
    try {
      await deleteAsset(courseId, selectedSectionId, assetId);
      notifySuccess("File removed.");
      await loadAssets();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setMutating(false);
    }
  };

  const previewUrl = courseId
    ? selectedSectionId
      ? `/?course_id=${encodeURIComponent(courseId)}&section_id=${encodeURIComponent(selectedSectionId)}`
      : `/?course_id=${encodeURIComponent(courseId)}`
    : "/";

  const studentLink = courseId ? `/?course_id=${encodeURIComponent(courseId)}` : "/";

  if (loading) {
    return (
      <AdminLayout
        onLogout={onLogout}
        title="Loading…"
        backTo="/admin"
        backLabel="Courses"
      >
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      onLogout={onLogout}
      title={courseTitle}
      subtitle="Modules and knowledge files"
      backTo="/admin"
      backLabel="Courses"
    >
      <PageMotion className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-2 justify-end">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/20"
          >
            <MessageSquare className="w-4 h-4" />
            Preview AI
          </a>
          <button
            type="button"
            onClick={() => void handleDeleteCourse()}
            disabled={mutating}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete course
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[240px_1fr] min-h-[480px]">
          {/* Modules sidebar */}
          <aside className="rounded-2xl glass-card border-white/10 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm">Modules</h3>
            </div>

            <form onSubmit={(e) => void handleAddModule(e)} className="flex gap-2 mb-4">
              <input
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="Week 1…"
                className="flex-1 min-w-0 rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
                disabled={mutating}
              />
              <button
                type="submit"
                disabled={mutating || !newModuleTitle.trim()}
                title="Add module"
                className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add a module to start uploading.</p>
            ) : (
              <ul className="space-y-1 flex-1 overflow-y-auto">
                {sections.map((s) => (
                  <li key={s.id}>
                    <div className={cn(
                        "w-full rounded-lg flex items-center gap-1 group",
                        selectedSectionId === s.id
                          ? "bg-indigo-500/20 border border-indigo-500/30"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSectionId(s.id)}
                        className={cn(
                          "flex-1 min-w-0 text-left px-3 py-2 text-sm truncate transition-colors",
                          selectedSectionId === s.id ? "text-indigo-100" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {s.title}
                      </button>
                      <button
                        type="button"
                        title="Delete module"
                        onClick={() => void handleDeleteModule(s.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-300 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Content panel */}
          <main className="rounded-2xl glass-card border-white/10 p-4 sm:p-6 space-y-5">
            {!selectedSection ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Select or create a module on the left to add knowledge files.
              </p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{selectedSection.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload PDF, Word, or text files. Students chatting in this course will use this content.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `${window.location.origin}${studentLink}`
                      );
                      notifySuccess("Student chat link copied.");
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Copy student link
                  </button>
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
                  disabled={uploadLoading}
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
                    "w-full rounded-xl border-2 border-dashed px-4 py-10 text-center transition-all",
                    dragActive
                      ? "border-indigo-400/60 bg-indigo-500/10"
                      : "border-white/15 hover:border-indigo-500/35 hover:bg-muted/20",
                    uploadLoading && "opacity-60 pointer-events-none"
                  )}
                >
                  {uploadLoading ? (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading and indexing…
                    </span>
                  ) : (
                    <>
                      <FileUp className="w-7 h-7 mx-auto text-indigo-400/80 mb-2" />
                      <p className="text-sm font-medium">Drop files or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF · DOCX · TXT</p>
                    </>
                  )}
                </button>

                <form onSubmit={(e) => void handleUrl(e)} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="flex-1 rounded-xl border border-white/10 bg-background/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    disabled={urlLoading}
                  />
                  <button
                    type="submit"
                    disabled={urlLoading || !url.trim()}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium sm:w-36",
                      urlLoading || !url.trim()
                        ? "bg-muted text-muted-foreground"
                        : "border border-purple-500/30 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20"
                    )}
                  >
                    {urlLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        Add link
                      </>
                    )}
                  </button>
                </form>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Files in this module</h4>
                    {assetsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>

                  {assets.length === 0 && !assetsLoading ? (
                    <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-white/10 rounded-xl">
                      No files yet. Upload above to build the knowledge base.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {assets.map((a) => (
                        <li
                          key={a.id}
                          className={cn(
                            "flex items-start justify-between gap-3 rounded-xl border px-3 py-3 bg-background/40",
                            assetStatusClass(a.status ?? "ready")
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{a.label}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <AssetStatusBadge status={a.status ?? "ready"} />
                              <span className="text-[10px] text-muted-foreground uppercase">
                                {a.source_type}
                              </span>
                              {a.status === "ready" && (
                                <span className="text-[10px] text-muted-foreground">
                                  {a.chunks_count} chunks
                                </span>
                              )}
                            </div>
                            {a.status === "failed" && a.error_message && (
                              <p className="text-xs text-red-300/90 mt-2 line-clamp-2">{a.error_message}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            title="Remove"
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
                </div>
              </>
            )}
          </main>
        </div>
      </PageMotion>
    </AdminLayout>
  );
}

export default AdminCourseWorkspace;
