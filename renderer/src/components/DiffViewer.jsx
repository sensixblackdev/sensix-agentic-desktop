import React, { useState } from 'react';
import { GitCompare, ChevronDown, ChevronRight } from 'lucide-react';

export function DiffViewer({ diff }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!diff) return null;

  const diffCount = diff.diffLines >= 0 ? `+${diff.diffLines}` : `${diff.diffLines}`;

  return (
    <div className="tool-diff-container">
      <button
        type="button"
        className="tool-diff-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <GitCompare size={12} strokeWidth={2} className="diff-icon" />
        <span className="diff-tag">± Diff</span>
        <span className="diff-path">{diff.path}</span>
        <span className="diff-count">({diffCount} lin)</span>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {isOpen && (
        <div className="tool-diff-preview fade-in">
          <div className="diff-file-title">Alteração em {diff.path}</div>
          {diff.oldSnippet && (
            <pre className="diff-line-removed">
              <code>- {diff.oldSnippet}</code>
            </pre>
          )}
          {diff.newSnippet && (
            <pre className="diff-line-added">
              <code>+ {diff.newSnippet}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
