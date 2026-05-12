/**
 * Demo admin gate only — change these values in source before any real deployment.
 */
export const ADMIN_LOGIN_EMAIL = "admin@eduai.local";
export const ADMIN_LOGIN_PASSWORD = "EduAI_Admin_2026";

const SESSION_KEY = "rag_admin_authenticated";

export function validateAdminCredentials(email: string, password: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const expectedEmail = ADMIN_LOGIN_EMAIL.trim().toLowerCase();
  return normalizedEmail === expectedEmail && password === ADMIN_LOGIN_PASSWORD;
}

export function isAdminSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function setAdminSession(): void {
  sessionStorage.setItem(SESSION_KEY, "1");
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
