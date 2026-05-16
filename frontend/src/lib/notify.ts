import { toast, type ToastOptions } from "react-toastify";

const DEFAULT_TOAST_MS = 2200;

const baseOptions: ToastOptions = {
  autoClose: DEFAULT_TOAST_MS,
  pauseOnHover: false,
};

export function notifySuccess(message: string): void {
  toast.success(message, baseOptions);
}

export function notifyError(message: string): void {
  const text = message.length > 280 ? `${message.slice(0, 280)}…` : message;
  toast.error(text, baseOptions);
}
