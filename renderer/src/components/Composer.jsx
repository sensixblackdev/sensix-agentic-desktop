import React, { useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Terminal, HelpCircle } from 'lucide-react';

export function Composer({
  input,
  setInput,
  isSending,
  onSend,
  onCancel,
  attachments = [],
  onAttachFiles,
  onRemoveAttachment,
  runStatus = ''
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) onSend();
    }
  };

  return (
    <div className="composer-area">
      {runStatus && (
        <div className="run-status-bar fade-in" data-active="true">
          <span className="run-status-dot"></span>
          <span className="run-status-text">{runStatus}</span>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="attachments-preview-bar">
          {attachments.map((att, idx) => (
            <div key={idx} className="attachment-chip">
              <Paperclip size={12} />
              <span className="attachment-name">{att.name || att.path}</span>
              <button
                type="button"
                className="attachment-remove-btn"
                onClick={() => onRemoveAttachment(idx)}
                aria-label="Remover anexo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="composer-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (isSending) onCancel();
          else onSend();
        }}
      >
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Peça uma implementação, refatoração, análise ou use /help..."
          rows={1}
          disabled={isSending}
        />

        <div className="composer-toolbar">
          <div className="composer-tools-left">
            <button
              type="button"
              className="composer-tool-btn"
              onClick={onAttachFiles}
              title="Anexar arquivos ou mídias"
              aria-label="Anexar arquivos"
            >
              <Paperclip size={14} />
              <span>Anexar</span>
            </button>
            <span className="composer-hint-text">
              <kbd>Enter</kbd> enviar · <kbd>Shift Enter</kbd> linha · <kbd>Esc</kbd> parar
            </span>
          </div>

          <button
            type="submit"
            className={`composer-submit-btn ${isSending ? 'stop-mode' : 'send-mode'}`}
            aria-label={isSending ? 'Interromper execução' : 'Enviar mensagem'}
          >
            {isSending ? (
              <>
                <Square size={13} fill="currentColor" />
                <span>Parar (Esc)</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
