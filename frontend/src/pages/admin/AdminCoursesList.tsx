import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { notifyError, notifySuccess } from "../../lib/notify";
import { motion } from "framer-motion";
import AdminLayout from "../../components/admin/AdminLayout";
import { Skeleton } from "../../components/ui/Skeleton";
import { PageMotion } from "../../components/ui/PageMotion";
import { cn } from "../../lib/utils";
import { createCourse, listCourses, type Course } from "../../services/adminService";
import { BookOpen, FolderPlus, Layers, Loader2, FileText } from "lucide-react";

interface AdminCoursesListProps {
  onLogout: () => void;
}

function AdminCoursesList({ onLogout }: AdminCoursesListProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCourses(await listCourses());
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      await createCourse(title);
      setNewTitle("");
      setShowForm(false);
      notifySuccess("Course created.");
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout} title="My courses" subtitle="Select a course to manage modules and knowledge">
      <PageMotion className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Courses</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Each course has modules (weeks). Upload files into a module so the AI can answer student questions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 ai-glow shrink-0"
          >
            <FolderPlus className="w-4 h-4" />
            New course
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="rounded-2xl glass-card border-white/10 p-5 flex flex-col sm:flex-row gap-3"
          >
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Course name, e.g. Biology 101"
              className="flex-1 rounded-xl border border-white/10 bg-background/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
              disabled={creating}
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className={cn(
                "rounded-xl px-5 py-2.5 text-sm font-medium",
                creating || !newTitle.trim()
                  ? "bg-muted text-muted-foreground"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              )}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No courses yet. Click &quot;New course&quot; to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c, index) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
              >
              <Link
                to={`/admin/course/${c.id}`}
                className="group block rounded-2xl glass-card border-white/10 p-5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate group-hover:text-indigo-200 transition-colors">
                      {c.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {c.module_count ?? 0} modules
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {c.file_count ?? 0} files
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-indigo-400/80 mt-4">Open course →</p>
              </Link>
              </motion.div>
            ))}
          </div>
        )}
      </PageMotion>
    </AdminLayout>
  );
}

export default AdminCoursesList;
