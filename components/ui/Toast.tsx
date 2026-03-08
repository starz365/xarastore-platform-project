'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils/css';

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const variantIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const variantColors = {
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  loading: 'bg-gray-50 border-gray-200 text-gray-900',
};

const variantIconColors = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
  loading: 'text-gray-600 animate-spin',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    const duration = toast.duration ?? 4000;
    setTimeout(() => removeToast(id), duration);
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss if duration is provided
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function Toaster() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => {
        const Icon = variantIcons[toast.variant];
        
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start p-4 rounded-lg border shadow-lg animate-fade-in',
              variantColors[toast.variant]
            )}
            role="alert"
            aria-live="assertive"
          >
            <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', variantIconColors[toast.variant])} />
            <div className="ml-3 flex-1">
              <h3 className="font-semibold">{toast.title}</h3>
              {toast.description && (
                <p className="text-sm mt-1 opacity-90">{toast.description}</p>
              )}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="mt-2 text-sm font-medium underline hover:no-underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 p-1 rounded hover:bg-black/5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function toast(title: string, options?: {
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  if (typeof window === 'undefined') return;

  const event = new CustomEvent('xarastore-toast', {
    detail: { title, ...options },
  });
  window.dispatchEvent(event);
}

// Global toast function for use outside React components
if (typeof window !== 'undefined') {
  window.addEventListener('xarastore-toast', ((e: CustomEvent) => {
    const { detail } = e;
    // This would dispatch to the ToastProvider via context
    // In a real implementation, you'd use a global store
    console.log('Toast event:', detail);
  }) as EventListener);
}
