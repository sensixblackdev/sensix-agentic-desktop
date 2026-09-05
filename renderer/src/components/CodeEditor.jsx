import React, { useRef, useEffect, useState } from 'react';
import { Save, Sparkles, Copy, Check, FileCode, CornerDownLeft } from 'lucide-react';

export function CodeEditor({
  value = '',
  onChange,
  onSave,
  onOpenAI,
  filePath = '',
  isDirty = false,
  isSaving = false,
  language = 'javascript'
}) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = value.split(/\r?\n/);

  // Sync scrolling between textarea and line numbers gutter
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+S / Cmd+S -> Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!isSaving && onSave) onSave();
      return;
    }

    // Ctrl+I / Cmd+I -> Open AI Inline Assistant
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      if (onOpenAI) onOpenAI();
      return;
    }

    // Tab -> 2 spaces indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Unindent current line if starts with 2 spaces
        const before = value.substring(0, start);
        const lastLineStart = before.lastIndexOf('\n') + 1;
        const line = value.substring(lastLineStart, end);
        if (line.startsWith('  ')) {
          const next = value.substring(0, lastLineStart) + line.substring(2) + value.substring(end);
          onChange(next);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lastLineStart, start - 2);
          }, 0);
        }
      } else {
        // Insert 2 spaces
        const next = value.substring(0, start) + '  ' + value.substring(end);
        onChange(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
      return;
    }

    // Enter -> Auto-indent matching previous line
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const before = value.substring(0, start);
      const lastLine = before.split('\n').pop() || '';
      const indentMatch = lastLine.match(/^(\s+)/);
      if (indentMatch) {
        e.preventDefault();
        const indent = indentMatch[1];
        const next = value.substring(0, start) + '\n' + indent + value.substring(textarea.selectionEnd);
        onChange(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        }, 0);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="code-editor-root">
      <div className="code-editor-toolbar">
        <div className="code-editor-tab-meta">
          <FileCode size={14} className="text-accent" />
          <span className="code-editor-filename">{filePath || 'untitled'}</span>
          {isDirty && <span className="dirty-indicator" title="Alterações não salvas (Ctrl+S para salvar)">●</span>}
          <span className="code-editor-lang-tag">{language}</span>
        </div>

        <div className="code-editor-toolbar-actions">
          <button
            type="button"
            className="editor-action-btn ai-btn-highlight"
            onClick={onOpenAI}
            title="Assistente de IA Inline (Ctrl+I)"
          >
            <Sparkles size={13} className="text-accent" />
            <span>Assistente IA (Ctrl+I)</span>
          </button>

          <button
            type="button"
            className={`editor-action-btn ${isDirty ? 'btn-save-active' : ''}`}
            onClick={onSave}
            disabled={isSaving || !isDirty}
            title="Salvar alterações no disco (Ctrl+S)"
          >
            <Save size={13} className={isDirty ? 'text-accent' : 'text-dim'} />
            <span>{isSaving ? 'Salvando...' : 'Salvar (Ctrl+S)'}</span>
          </button>

          <button
            type="button"
            className="editor-action-btn"
            onClick={handleCopy}
            title="Copiar código"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      <div className="code-editor-workspace">
        <div className="editor-gutter" ref={lineNumbersRef} aria-hidden="true">
          {lines.map((_, idx) => (
            <div key={idx} className="editor-line-number">
              {idx + 1}
            </div>
          ))}
        </div>

        <div className="editor-textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
          />
        </div>
      </div>

      <div className="code-editor-statusbar">
        <div className="statusbar-left">
          <span>{lines.length} linhas</span>
          <span className="statusbar-sep">·</span>
          <span>{value.length} caracteres</span>
          {isDirty && (
            <>
              <span className="statusbar-sep">·</span>
              <span className="text-warning">Não salvo</span>
            </>
          )}
        </div>
        <div className="statusbar-right">
          <span>UTF-8</span>
          <span className="statusbar-sep">·</span>
          <span>Tab: 2 espaços</span>
          <span className="statusbar-sep">·</span>
          <span className="statusbar-shortcut-hint">Ctrl+S Salvar · Ctrl+I Assistente IA</span>
        </div>
      </div>
    </div>
  );
}
