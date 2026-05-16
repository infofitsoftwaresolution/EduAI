import { clearAuth, getStoredUser, isAuthenticated, isAdmin } from "./auth";

export function isAdminSession(): boolean {
  return isAuthenticated() && isAdmin();
}

export function clearAdminSession(): void {
  clearAuth();
}

export function getAdminUserEmail(): string | null {
  return getStoredUser()?.email ?? null;
}
