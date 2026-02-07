"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (opts: { type: ToastType; message: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const ACCENT: Record<ToastType, string> = {
  success: "border-l-emerald-500 bg-emerald-500/5",
  error: "border-l-red-500 bg-red-500/5",
  info: "border-l-blue-500 bg-blue-500/5",
};

const ICON_COLOR: Record<ToastType, string> = {
  success: "text-emerald-400",
  error: "text-red-400",
  info: "text-blue-400",
};

const AUTO_DISMISS: Record<ToastType, number | null> = {
  success: 3000,
  error: null,
  info: 5000,
};

let toastId = 0;

function ToastEntry({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 200);
  }, [item.id, onDismiss]);

  useEffect(() => {
    const duration = AUTO_DISMISS[item.type];
    if (duration) {
      timerRef.current = setTimeout(dismiss, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.type, dismiss]);

  const Icon = ICONS[item.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-gray-800 border-l-4 px-4 py-3 shadow-lg transition-all duration-200 ${
        ACCENT[item.type]
      } ${exiting ? "opacity-0 translate-x-4" : "animate-slideUp"}`}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${ICON_COLOR[item.type]}`} />
      <p className="flex-1 text-sm text-gray-200">{item.message}</p>
      <button
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    ({ type, message }: { type: ToastType; message: string }) => {
      const id = String(++toastId);
      setToasts((prev) => [...prev, { id, type, message }]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80">
        {toasts.map((item) => (
          <ToastEntry key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
