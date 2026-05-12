const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export interface HealthResponse {
  status: string;
}

export interface HealthCheckResult extends HealthResponse {
  latencyMs: number;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
}

export interface Section {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface Asset {
  id: string;
  course_id: string;
  section_id: string;
  source_type: string;
  label: string;
  chunks_count: number;
}

export interface CourseDetailResponse {
  course: Course;
  sections: Section[];
}

export interface IngestAssetResponse {
  message: string;
  asset: Asset;
  chunks_added: number;
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) return JSON.stringify(j.detail);
  } catch {
    /* ignore */
  }
  return text || `HTTP ${response.status}`;
}

export async function fetchHealth(): Promise<HealthCheckResult> {
  const started = performance.now();
  const response = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
  const latencyMs = Math.round(performance.now() - started);
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status}): ${await parseError(response)}`);
  }
  const data = (await response.json()) as HealthResponse;
  return { ...data, latencyMs };
}

export async function fetchRoot(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Root check failed (${response.status}): ${await parseError(response)}`);
  }
  return response.json();
}

export async function listCourses(): Promise<Course[]> {
  const response = await fetch(`${API_BASE_URL}/courses`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function createCourse(title: string, description?: string): Promise<Course> {
  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description: description || null }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function getCourse(courseId: string): Promise<CourseDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(courseId)}`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function deleteCourse(courseId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(courseId)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function listSections(courseId: string): Promise<Section[]> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections`
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function createSection(
  courseId: string,
  title: string,
  position = 0
): Promise<Section> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, position }),
    }
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function deleteSection(courseId: string, sectionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error(await parseError(response));
}

export async function listAssets(courseId: string, sectionId: string): Promise<Asset[]> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/assets`
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function ingestFileToSection(
  courseId: string,
  sectionId: string,
  file: File
): Promise<IngestAssetResponse> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/assets/file`,
    { method: "POST", body: form }
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function ingestUrlToSection(
  courseId: string,
  sectionId: string,
  url: string
): Promise<IngestAssetResponse> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/assets/url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    }
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function deleteAsset(
  courseId: string,
  sectionId: string,
  assetId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/assets/${encodeURIComponent(assetId)}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error(await parseError(response));
}
