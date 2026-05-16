import { authHeaders } from "../lib/auth";
import { parseApiError } from "../lib/parseApiError";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function apiInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...authHeaders(),
    },
  };
}

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
  module_count?: number;
  file_count?: number;
}

export type AssetStatus = "processing" | "ready" | "failed";

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
  status: AssetStatus;
  error_message?: string | null;
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

export async function fetchHealth(): Promise<HealthCheckResult> {
  const started = performance.now();
  const response = await fetch(`${API_BASE_URL}/health`, apiInit({ method: "GET" }));
  const latencyMs = Math.round(performance.now() - started);
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status}): ${await parseApiError(response)}`);
  }
  const data = (await response.json()) as HealthResponse;
  return { ...data, latencyMs };
}

export async function fetchRoot(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/`, apiInit({ method: "GET" }));
  if (!response.ok) {
    throw new Error(`Root check failed (${response.status}): ${await parseApiError(response)}`);
  }
  return response.json();
}

export async function listCourses(): Promise<Course[]> {
  const response = await fetch(`${API_BASE_URL}/courses`, apiInit());
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function createCourse(title: string, description?: string): Promise<Course> {
  const response = await fetch(
    `${API_BASE_URL}/courses`,
    apiInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || null }),
    })
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function getCourse(courseId: string): Promise<CourseDetailResponse> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}`,
    apiInit()
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function deleteCourse(courseId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}`,
    apiInit({ method: "DELETE" })
  );
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function listSections(courseId: string): Promise<Section[]> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections`,
    apiInit()
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function createSection(
  courseId: string,
  title: string,
  position = 0
): Promise<Section> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections`,
    apiInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, position }),
    })
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function deleteSection(courseId: string, sectionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}`,
    apiInit({ method: "DELETE" })
  );
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function listAssets(courseId: string, sectionId: string): Promise<Asset[]> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/assets`,
    apiInit()
  );
  if (!response.ok) throw new Error(await parseApiError(response));
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
    apiInit({ method: "POST", body: form })
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function ingestUrlToSection(
  courseId: string,
  sectionId: string,
  url: string
): Promise<IngestAssetResponse> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/assets/url`,
    apiInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    })
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export async function deleteAsset(
  courseId: string,
  sectionId: string,
  assetId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/assets/${encodeURIComponent(assetId)}`,
    apiInit({ method: "DELETE" })
  );
  if (!response.ok) throw new Error(await parseApiError(response));
}
