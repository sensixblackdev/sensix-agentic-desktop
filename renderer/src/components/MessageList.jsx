import React, { useRef, useEffect } from 'react';
import { ToolTimeline } from './ToolTimeline';
import { Copy, Check, Sparkles, User, Bot } from 'lucide-react';

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-lang-label">{lang || 'código'}</span>
        <button type="button" className="code-copy-btn" onClick={handleCopy}>
          {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          <span>{copied ? 'Copiado!' : 'Copiar'}</span>
        </button>
      </div>
      <pre className="code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderContentBlocks(text = '') {
  let cleanText = String(text || '');
  if (cleanText.includes('\\n') && !cleanText.includes('\n')) {
    cleanText = cleanText.replace(/\\n/g, '\n');
  }

  const lines = cleanText.split(/\r?\n/);
  const blocks = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('\n').trim();
    if (content) {
      blocks.push(
        <p key={'p_' + blocks.length} className="message-paragraph">
          {content}
        </p>
      );
    }
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      flushParagraph();
      if (inCode) {
        blocks.push(
          <CodeBlock
            key={'code_' + blocks.length}
            code={codeLines.join('\n')}
            lang={codeLang}
          />
        );
        codeLines = [];
        codeLang = '';
      } else {
        codeLang = trimmed.slice(3).trim();
      }
      inCode = !inCode;
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      flushParagraph();
      return;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushParagraph();
      const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
      const heading = match ? match[2] : trimmed;
      blocks.push(
        <h3 key={'h_' + blocks.length} className="message-heading">
          {heading}
        </h3>
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push(
        <li key={'li_' + blocks.length} className="message-list-item">
          {trimmed.replace(/^[-*]\s+/, '')}
        </li>
      );
      return;
    }

    paragraph.push(line);
  });

  if (inCode) {
    blocks.push(
      <CodeBlock
        key={'code_' + blocks.length}
        code={codeLines.join('\n')}
        lang={codeLang}
      />
    );
  }
  flushParagraph();

  return blocks;
}

export function MessageList({ messages = [], isThinking = false }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  if (!messages || messages.length === 0) {
    return (
      <div className="empty-chat-welcome fade-in">
        <div className="welcome-brand-mark">
          <Sparkles size={24} className="text-accent" />
        </div>
        <h2>SENSIX Agentic Desktop</h2>
        <p>Ambiente agêntico autônomo com auto-healing, execução paralela e RAG contextual.</p>
        <div className="welcome-shortcuts">
          <div className="shortcut-card">
            <code>/help</code>
            <span>Ver central de comandos</span>
          </div>
          <div className="shortcut-card">
            <code>/status</code>
            <span>Diagnóstico do workspace</span>
          </div>
          <div className="shortcut-card">
            <code>/rules</code>
            <span>Diretrizes e estatísticas RAG</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-scroll-area">
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const steps = Array.isArray(msg.steps) ? msg.steps : [];

        return (
          <article
            key={msg.id || index}
            className={`chat-message-row ${isUser ? 'message-user' : 'message-assistant'} fade-in`}
          >
            <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`} aria-hidden="true">
              {isUser ? <User size={15} /> : <Bot size={16} className="text-accent" />}
            </div>
            <div className="message-bubble-wrapper">
              <div className="message-meta-info">
                <span className="sender-name">{isUser ? 'Você' : 'SENSIX Agent'}</span>
                {msg.timestamp && (
                  <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>

              {steps.length > 0 && <ToolTimeline steps={steps} />}

              <div className="message-body-content">
                {renderContentBlocks(msg.content)}
              </div>
            </div>
          </article>
        );
      })}

      {isThinking && (
        <div className="thinking-indicator fade-in">
          <div className="thinking-pulse-dot"></div>
          <span>Agente raciocinando...</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
