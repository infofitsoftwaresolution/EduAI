type ValidationIssue = {
  msg?: string;
  loc?: unknown[];
};

function formatValidationDetail(detail: ValidationIssue[]): string {
  const first = detail[0];
  if (!first?.msg) return "Invalid request. Check your input and try again.";

  const msg = first.msg;
  if (msg.includes("valid email")) return "Enter a valid email address.";
  if (msg.includes("at least") && msg.includes("characters")) {
    return "Password must be at least 6 characters.";
  }

  const field = first.loc?.filter((part) => typeof part === "string").pop();
  if (typeof field === "string" && field !== "body") {
    return `${field}: ${msg}`;
  }
  return msg;
}

/** Turn FastAPI / HTTP error bodies into a short user-facing string. */
export async function parseApiError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Request failed (${response.status})`;

  try {
    const body = JSON.parse(text) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return formatValidationDetail(body.detail as ValidationIssue[]);
  } catch {
    /* not JSON */
  }

  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}
