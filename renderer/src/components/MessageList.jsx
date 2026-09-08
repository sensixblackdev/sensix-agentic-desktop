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

function renderInlineMarkdown(text) {
  if (!text) return null;
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
    }
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      return <strong key={i} className="inline-strong">{renderInlineMarkdown(part.slice(2, -2))}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      return <em key={i} className="inline-em">{part.slice(1, -1)}</em>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="inline-link">
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
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
  let currentList = null; // { type: 'ul' | 'ol', items: [] }
  let paragraph = [];

  const flushList = () => {
    if (!currentList || currentList.items.length === 0) {
      currentList = null;
      return;
    }
    const items = currentList.items.map((item, idx) => (
      <li key={'li_' + idx} className="message-list-item">
        {renderInlineMarkdown(item)}
      </li>
    ));
    if (currentList.type === 'ol') {
      blocks.push(
        <ol key={'ol_' + blocks.length} className="message-ordered-list">
          {items}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={'ul_' + blocks.length} className="message-list">
          {items}
        </ul>
      );
    }
    currentList = null;
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('\n').trim();
    if (content) {
      blocks.push(
        <p key={'p_' + blocks.length} className="message-paragraph">
          {paragraph.map((pLine, pIdx) => (
            <React.Fragment key={pIdx}>
              {renderInlineMarkdown(pLine)}
              {pIdx < paragraph.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    }
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Code blocks delimiter
    if (trimmed.startsWith('```')) {
      flushList();
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

    // Empty lines
    if (!trimmed) {
      flushList();
      flushParagraph();
      return;
    }

    // Horizontal dividers (---, ***, --- ---, etc.)
    if (/^(?:-{3,}|\*{3,}|_{3,}|-\s*-\s*-)(?:\s+-\s*-\s*-)*$/.test(trimmed)) {
      flushList();
      flushParagraph();
      blocks.push(<hr key={'hr_' + blocks.length} className="message-divider" />);
      return;
    }

    // Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      const level = headingMatch[1].length;
      const headingContent = renderInlineMarkdown(headingMatch[2]);
      if (level === 1) {
        blocks.push(<h1 key={'h1_' + blocks.length} className="message-heading h1">{headingContent}</h1>);
      } else if (level === 2) {
        blocks.push(<h2 key={'h2_' + blocks.length} className="message-heading h2">{headingContent}</h2>);
      } else if (level === 3) {
        blocks.push(<h3 key={'h3_' + blocks.length} className="message-heading h3">{headingContent}</h3>);
      } else {
        blocks.push(<h4 key={'h4_' + blocks.length} className="message-heading h4">{headingContent}</h4>);
      }
      return;
    }

    // Blockquotes (> text)
    if (trimmed.startsWith('>')) {
      flushList();
      flushParagraph();
      blocks.push(
        <blockquote key={'bq_' + blocks.length} className="message-quote">
          {renderInlineMarkdown(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
      return;
    }

    // Bullet lists (- , * , • )
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Ordered numbered lists (1. , 2. )
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      return;
    }

    // Regular text line inside paragraph
    flushList();
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
  flushList();
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
      {messages.filter(Boolean).map((msg, index) => {
        const isUser = msg?.role === 'user';
        const steps = Array.isArray(msg?.steps) ? msg.steps : [];

        return (
          <article
            key={msg?.id || index}
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

              {msg.content ? (
                <div className={`message-body-content ${msg.isError ? 'message-body-error' : ''}`}>
                  {renderContentBlocks(msg.content)}
                </div>
              ) : !isUser ? (
                <div className="message-body-content message-body-loading">
                  <div className="thinking-pulse-dot"></div>
                  <span>Agente raciocinando...</span>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}

      {isThinking && !messages.some((msg) => msg?.role === 'assistant' && !msg?.content) && (
        <div className="thinking-indicator fade-in">
          <div className="thinking-pulse-dot"></div>
          <span>Agente raciocinando...</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
