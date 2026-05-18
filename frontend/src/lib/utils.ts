import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Works on http:// IP hosts where crypto.randomUUID may be unavailable. */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID()
    } catch {
      /* fall through */
    }
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
