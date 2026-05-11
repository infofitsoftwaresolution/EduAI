const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface AskRequest {
  question: string;
  session_id: string;
  top_k?: number;
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

export interface SessionTurn {
  question: string;
  answer: string;
}

export interface SessionResponse {
  session_id: string;
  turns: number;
  history: SessionTurn[];
}

export async function askQuestion(payload: AskRequest): Promise<AskResponse> {
  const response = await fetch(`${API_BASE_URL}/ask/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ask API failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/ask/session/${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Get session failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function clearSessionOnServer(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ask/session/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clear session failed (${response.status}): ${errorText}`);
  }
}