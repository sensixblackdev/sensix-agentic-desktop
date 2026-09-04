import React, { useState } from 'react';
import { ChevronDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DiffViewer } from './DiffViewer';

export function ToolTimeline({ steps = [] }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className={`tool-timeline ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="tool-timeline-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <span>{collapsed ? 'Mostrar' : 'Ocultar'} etapas · {steps.length}</span>
        <ChevronDown size={13} className={`timeline-arrow ${collapsed ? 'rotate-90' : ''}`} />
      </button>

      {!collapsed && (
        <div className="tool-timeline-body">
          {steps.map((step) => {
            const isRunning = step.status === 'running';
            const isError = step.status === 'error';
            return (
              <div key={step.id || Math.random()} className={`tool-step ${step.status || 'running'}`}>
                <div className="tool-step-state" aria-hidden="true">
                  {isRunning ? (
                    <Loader2 size={12} className="spin text-accent" />
                  ) : isError ? (
                    <AlertCircle size={12} className="text-danger" />
                  ) : (
                    <CheckCircle2 size={12} className="text-success" />
                  )}
                </div>
                <div className="tool-step-info">
                  <strong>{step.tool || 'tool'}</strong>
                  <small>{step.summary || step.description || 'Executando...'}</small>
                  {step.diff && <DiffViewer diff={step.diff} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
