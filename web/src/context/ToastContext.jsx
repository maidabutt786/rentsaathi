import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

const ToastContext = createContext({ push: () => {}, dismiss: () => {} });

const TONE = {
  success: { icon: CheckCircle2, className: "border-status-verified/30 bg-white text-ink", iconClass: "text-status-verified" },
  error: { icon: XCircle, className: "border-status-highrisk/30 bg-white text-ink", iconClass: "text-status-highrisk" },
  warning: { icon: AlertTriangle, className: "border-status-suspicious/30 bg-white text-ink", iconClass: "text-status-suspicious" },
  info: { icon: Info, className: "border-status-info/30 bg-white text-ink", iconClass: "text-status-info" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = "info", options = {}) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { id, message, tone, title: options.title }]);
      const timeout = options.timeout ?? 4500;
      if (timeout > 0) {
        setTimeout(() => dismiss(id), timeout);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [dismiss, push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const tone = TONE[toast.tone] || TONE.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-card animate-fade-in ${tone.className}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClass}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                {toast.title ? <p className="font-semibold">{toast.title}</p> : null}
                <p className="text-muted">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1 text-muted transition hover:bg-subtle hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
