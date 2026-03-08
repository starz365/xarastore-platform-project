'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/classNames';

/* ----------------------------------------------------
   Types
---------------------------------------------------- */

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
}

/* ----------------------------------------------------
   Config
---------------------------------------------------- */

const MAX_TOASTS = 4;
const DEFAULT_DURATION = 5000;

/* ----------------------------------------------------
   Context
---------------------------------------------------- */

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/* ----------------------------------------------------
   Icons
---------------------------------------------------- */

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
};

/* ----------------------------------------------------
   Colors
---------------------------------------------------- */

const toastColors = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  loading: 'bg-gray-50 border-gray-200 text-gray-800',
};

/* ----------------------------------------------------
   Utils
---------------------------------------------------- */

function normalize(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;

  if (typeof value === 'object') {
    if ('description' in (value as any)) {
      return String((value as any).description);
    }
    return JSON.stringify(value);
  }

  return String(value);
}

/* ----------------------------------------------------
   Provider
---------------------------------------------------- */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = (id: string) => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (toast: Omit<Toast, 'id'> & { id?: string }) => {
    const id = toast.id ?? crypto.randomUUID();

    const normalizedToast: Toast = {
      id,
      title: normalize(toast.title) ?? '',
      description: normalize(toast.description),
      type: toast.type,
      duration: toast.duration ?? DEFAULT_DURATION,
      action: toast.action,
    };

    setToasts((prev) => {
      const deduped = prev.filter((t) => t.title !== normalizedToast.title);

      const next = [normalizedToast, ...deduped];

      return next.slice(0, MAX_TOASTS);
    });

    if (normalizedToast.type !== 'loading') {
      const timer = setTimeout(() => {
        removeToast(id);
      }, normalizedToast.duration);

      timers.current.set(id, timer);
    }

    return id;
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<any>;
      addToast(custom.detail);
    };

    window.addEventListener('xarastore-toast', handler);

    return () => {
      window.removeEventListener('xarastore-toast', handler);
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/* ----------------------------------------------------
   Hook
---------------------------------------------------- */

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

/* ----------------------------------------------------
   Toaster UI
---------------------------------------------------- */

export function Toaster() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[380px] max-w-[95vw]">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];

        return (
          <div
            key={toast.id}
            className={cn(
              'relative rounded-lg border p-4 shadow-xl animate-in slide-in-from-right-8',
              toastColors[toast.type]
            )}
          >
            <div className="flex gap-3">
              <Icon
                className={cn(
                  'w-5 h-5 mt-0.5',
                  toast.type === 'loading' && 'animate-spin'
                )}
              />

              <div className="flex-1">
                <h3 className="font-semibold text-sm">{toast.title}</h3>

                {toast.description && (
                  <p className="text-sm opacity-90 mt-1">
                    {toast.description}
                  </p>
                )}

                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="mt-2 text-sm font-medium underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {toast.duration && toast.type !== 'loading' && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-black/10">
                <div
                  className="h-full bg-black/30 animate-[toast-progress_linear_forwards]"
                  style={{
                    animationDuration: `${toast.duration}ms`,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------
   Dispatcher
---------------------------------------------------- */

export function toast(options: Omit<Toast, 'id'> & { id?: string }) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('xarastore-toast', {
      detail: options,
    })
  );
}

/* ----------------------------------------------------
   Helpers
---------------------------------------------------- */

toast.success = (title: string, description?: any, duration?: number) => {
  toast({ title, description, type: 'success', duration });
};

toast.error = (title: string, description?: any, duration?: number) => {
  toast({ title, description, type: 'error', duration });
};

toast.warning = (title: string, description?: any, duration?: number) => {
  toast({ title, description, type: 'warning', duration });
};

toast.info = (title: string, description?: any, duration?: number) => {
  toast({ title, description, type: 'info', duration });
};

toast.loading = (title: string, description?: any) => {
  const id = crypto.randomUUID();

  toast({
    id,
    title,
    description,
    type: 'loading',
    duration: 999999,
  });

  return id;
};

toast.action = (
  title: string,
  description: string,
  label: string,
  onClick: () => void
) => {
  toast({
    title,
    description,
    type: 'info',
    action: { label, onClick },
  });
};

toast.promise = async function <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) {
  const id = toast.loading(messages.loading);

  try {
    const result = await promise;

    toast({
      id,
      title: messages.success,
      type: 'success',
      duration: 4000,
    });

    return result;
  } catch (error: any) {
    toast({
      id,
      title: messages.error,
      description: normalize(error),
      type: 'error',
      duration: 5000,
    });

    throw error;
  }
};
