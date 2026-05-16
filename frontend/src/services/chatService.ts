import { authHeaders } from "../lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface AskRequest {
  question: string;
  session_id: string;
  top_k?: number;
  course_id?: string | null;
  section_id?: string | null;
}

export interface AskSource {
  filename: string;
  page: string | number;
  preview: string;
}

export interface AskResponse {
  session_id: string;
  question: string;
  answer: string;
  sources: AskSource[];
  total_sources: number;
}

export interface ChatSessionMeta {
  id: string;
  title: string;
  course_id: string | null;
  section_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AskSource[] | null;
  created_at: string;
}

export interface SessionDetailResponse {
  session: ChatSessionMeta;
  messages: ChatMessageDto[];
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* ignore */
  }
  return text || `HTTP ${response.status}`;
}

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
}

export async function listChatSessions(): Promise<ChatSessionMeta[]> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function createChatSession(params?: {
  title?: string;
  course_id?: string;
  section_id?: string;
}): Promise<ChatSessionMeta> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      title: params?.title ?? "New chat",
      course_id: params?.course_id ?? null,
      section_id: params?.section_id ?? null,
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetailResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { ...authHeaders() } }
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE", headers: { ...authHeaders() } }
  );
  if (!response.ok) throw new Error(await parseError(response));
}

export async function askQuestion(payload: AskRequest): Promise<AskResponse> {
  const response = await fetch(`${API_BASE_URL}/ask/`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

/** @deprecated Use deleteChatSession */
export async function clearSessionOnServer(sessionId: string): Promise<void> {
  await deleteChatSession(sessionId);
}

/** @deprecated Use getSessionDetail */
export async function getSession(sessionId: string): Promise<{
  session_id: string;
  turns: number;
  history: { question: string; answer: string }[];
}> {
  const detail = await getSessionDetail(sessionId);
  const history: { question: string; answer: string }[] = [];
  let q: string | null = null;
  for (const m of detail.messages) {
    if (m.role === "user") q = m.content;
    else if (m.role === "assistant" && q) {
      history.push({ question: q, answer: m.content });
      q = null;
    }
  }
  return { session_id: sessionId, turns: history.length, history };
}
