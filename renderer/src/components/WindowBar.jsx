import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export function WindowBar() {
  const handleMinimize = () => window.sensix?.minimizeWindow?.();
  const handleMaximize = () => window.sensix?.maximizeWindow?.();
  const handleClose = () => window.sensix?.closeWindow?.();

  return (
    <header className="windowbar" aria-label="Controles da janela">
      <div className="windowbar-brand">
        <span className="brand-mark">S</span>
        <span>
          SENSIX <small>AGENTIC DESKTOP</small>
        </span>
      </div>
      <div className="window-actions">
        <button
          className="window-action"
          type="button"
          onClick={handleMinimize}
          aria-label="Minimizar janela"
        >
          <Minus size={13} strokeWidth={2} />
        </button>
        <button
          className="window-action"
          type="button"
          onClick={handleMaximize}
          aria-label="Maximizar janela"
        >
          <Square size={12} strokeWidth={2} />
        </button>
        <button
          className="window-action window-close"
          type="button"
          onClick={handleClose}
          aria-label="Fechar janela"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
