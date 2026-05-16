import { toast, type ToastOptions } from "react-toastify";

/** Auto-dismiss after ~2s; explicit on every toast so admin pages inherit it reliably. */
export const TOAST_AUTO_CLOSE_MS = 2000;

export const toastOptions: ToastOptions = {
  autoClose: TOAST_AUTO_CLOSE_MS,
  pauseOnHover: false,
  pauseOnFocusLoss: false,
  hideProgressBar: true,
  closeOnClick: true,
};

export function notifySuccess(message: string): void {
  toast.success(message, toastOptions);
}

export function notifyError(message: string): void {
  const text = message.length > 280 ? `${message.slice(0, 280)}…` : message;
  toast.error(text, toastOptions);
}

export function dismissAllToasts(): void {
  toast.dismiss();
}
