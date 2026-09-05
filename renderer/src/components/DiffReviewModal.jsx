import React, { useEffect } from 'react';
import { Check, X, GitCompare, Sparkles, ArrowRight } from 'lucide-react';

export function DiffReviewModal({
  isOpen,
  originalCode = '',
  modifiedCode = '',
  instruction = '',
  modelUsed = '',
  onAccept,
  onReject,
  fileName = ''
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onReject();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onAccept();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onAccept, onReject]);

  if (!isOpen) return null;

  const originalLines = originalCode.split(/\r?\n/);
  const modifiedLines = modifiedCode.split(/\r?\n/);

  return (
    <div className="diff-review-overlay fade-in" role="dialog" aria-modal="true" aria-label="Revisão de Código IA">
      <div className="diff-review-container">
        <header className="diff-review-header">
          <div className="diff-header-info">
            <div className="diff-icon-badge">
              <GitCompare size={16} className="text-accent" />
            </div>
            <div>
              <h3>Revisão de Alterações IA · {fileName || 'Arquivo'}</h3>
              <p className="diff-instruction-summary">
                <span className="diff-tag-model">{modelUsed.split('/').pop()}</span>
                {instruction && <span className="diff-instruction-text">"{instruction}"</span>}
              </p>
            </div>
          </div>

          <div className="diff-header-actions">
            <button type="button" className="btn-secondary" onClick={onReject} title="Descartar alterações (Esc)">
              <X size={14} />
              <span>Descartar (Esc)</span>
            </button>
            <button type="button" className="btn-primary" onClick={onAccept} title="Aceitar e aplicar no editor (Ctrl+Enter)">
              <Check size={14} />
              <span>Aceitar Alterações (Ctrl+Enter)</span>
            </button>
          </div>
        </header>

        <div className="diff-panes-wrapper">
          <section className="diff-pane diff-pane-original" aria-label="Código Original">
            <div className="diff-pane-title">
              <span>Original ({originalLines.length} linhas)</span>
            </div>
            <div className="diff-pane-code-body">
              <div className="diff-gutter" aria-hidden="true">
                {originalLines.map((_, i) => (
                  <span key={i} className="diff-line-no">{i + 1}</span>
                ))}
              </div>
              <pre className="diff-pre">
                <code>{originalCode}</code>
              </pre>
            </div>
          </section>

          <div className="diff-separator">
            <ArrowRight size={16} className="text-accent" />
          </div>

          <section className="diff-pane diff-pane-modified" aria-label="Código Proposto pela IA">
            <div className="diff-pane-title title-highlight">
              <Sparkles size={12} className="text-accent" />
              <span>Proposto pela IA ({modifiedLines.length} linhas)</span>
            </div>
            <div className="diff-pane-code-body">
              <div className="diff-gutter" aria-hidden="true">
                {modifiedLines.map((_, i) => (
                  <span key={i} className="diff-line-no">{i + 1}</span>
                ))}
              </div>
              <pre className="diff-pre pre-highlight">
                <code>{modifiedCode}</code>
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
