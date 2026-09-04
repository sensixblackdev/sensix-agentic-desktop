import React, { useState } from 'react';
import { Copy, Check, FileCode, ExternalLink } from 'lucide-react';

export function CodeViewer({ code = '', filePath = '', language = 'javascript' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const lines = code.split(/\r?\n/);

  return (
    <div className="code-viewer-container">
      <div className="code-viewer-header">
        <div className="code-viewer-file-info">
          <FileCode size={14} className="text-accent" />
          <span className="code-viewer-filename">{filePath || 'untitled'}</span>
          <span className="code-viewer-lang">{language}</span>
          <span className="code-viewer-lines-count">{lines.length} linhas</span>
        </div>
        <div className="code-viewer-actions">
          <button type="button" className="btn-icon-action" onClick={handleCopy} title="Copiar código">
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      <div className="code-viewer-body">
        <div className="line-numbers-col" aria-hidden="true">
          {lines.map((_, i) => (
            <span key={i} className="line-number">{i + 1}</span>
          ))}
        </div>
        <pre className="code-content-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
