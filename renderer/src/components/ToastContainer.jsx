import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <aside className="toast-container" aria-live="polite" aria-label="Notificações">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || icons.info;
        return (
          <div key={toast.id} className={`toast-card toast-${toast.type} scale-in`} role="status">
            <div className="toast-icon-wrapper" aria-hidden="true">
              <Icon size={16} strokeWidth={2} />
            </div>
            <div className="toast-content">
              {toast.title && <strong className="toast-title">{toast.title}</strong>}
              {toast.message && <p className="toast-message">{toast.message}</p>}
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(toast.id)}
              aria-label="Fechar notificação"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
