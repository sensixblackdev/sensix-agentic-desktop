import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, Trash2, Copy, Check, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const HISTORY_LIMIT = 100;

export function TerminalPage() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([
    { cmd: 'Get-Location', output: 'D:\\WORKSPACE\\SANDBOX\\apps\\sensix-agentic-desktop', code: 0, ts: Date.now() }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const [copied, setCopied] = useState(null);
  const outputRef = useRef(null);
  const inputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const handleRun = async (e) => {
    e?.preventDefault();
    if (!command.trim() || isExecuting) return;
    const cmdToRun = command.trim();
    setCmdHistory((prev) => [cmdToRun, ...prev.slice(0, 49)]);
    setCmdIdx(-1);
    setIsExecuting(true);
    setCommand('');
    const startTs = Date.now();
    try {
      const res = await window.sensix?.executeCommand?.(cmdToRun);
      const elapsed = Date.now() - startTs;
      if (res?.code === 403) {
        setHistory((prev) => [...prev.slice(-HISTORY_LIMIT + 1), {
          cmd: cmdToRun, output: res.stderr, code: 403, ts: startTs, elapsed
        }]);
        addToast({ type: 'warning', title: 'Guardrail', message: 'Comando bloqueado por política de segurança.' });
      } else {
        const output = res?.stdout || res?.stderr || (res?.code === 0 ? '[Comando executado sem saída]' : '[Erro]');
        setHistory((prev) => [...prev.slice(-HISTORY_LIMIT + 1), {
          cmd: cmdToRun, output: output.trimEnd(), code: res?.code ?? 0, ts: startTs, elapsed
        }]);
      }
    } catch (err) {
      setHistory((prev) => [...prev.slice(-HISTORY_LIMIT + 1), {
        cmd: cmdToRun, output: `IPC Error: ${err.message}`, code: 1, ts: startTs
      }]);
      addToast({ type: 'error', title: 'Falha na execução', message: err.message });
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(cmdIdx + 1, cmdHistory.length - 1);
      setCmdIdx(next);
      setCommand(cmdHistory[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(cmdIdx - 1, -1);
      setCmdIdx(next);
      setCommand(next === -1 ? '' : cmdHistory[next]);
    }
  };

  const copyOutput = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="terminal-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <Terminal size={18} className="text-accent" />
          <h2>Terminal Integrado PowerShell</h2>
          <span className="badge badge-warning" title="Guardrail ativo — comandos destrutivos são bloqueados">
            <ShieldAlert size={11} /> Guardrail Ativo
          </span>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setHistory([])}>
            <Trash2 size={14} />
            <span>Limpar</span>
          </button>
        </div>
      </header>

      <div className="terminal-window" style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
            PowerShell 7 — sensix-agentic-desktop
          </span>
        </div>

        <div className="terminal-output" ref={outputRef} style={{ flex: 1 }}>
          {history.map((item, idx) => (
            <div key={idx} className="terminal-entry" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: 12 }}>PS&gt;</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)', fontSize: 12, flex: 1 }}>{item.cmd}</span>
                <button
                  type="button"
                  onClick={() => copyOutput(item.output, idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px 4px' }}
                  title="Copiar saída"
                >
                  {copied === idx ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                </button>
                {item.elapsed && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}>
                    {item.elapsed}ms
                  </span>
                )}
              </div>
              <pre style={{
                margin: 0, padding: '8px 10px',
                background: item.code === 403 ? 'rgba(245,158,11,0.08)' : item.code !== 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                borderLeft: `2px solid ${item.code === 403 ? '#f59e0b' : item.code !== 0 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '0 4px 4px 0',
                color: item.code === 403 ? '#fbbf24' : item.code !== 0 ? '#f87171' : '#94a3b8',
                fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all'
              }}>
                {item.output || '(sem saída)'}
              </pre>
            </div>
          ))}
          {isExecuting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <span className="spinner-inline" />
              <span>Executando...</span>
            </div>
          )}
        </div>

        <div className="terminal-prompt-line">
          <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: 12, flexShrink: 0 }}>PS&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando PowerShell... (↑↓ para histórico)"
            disabled={isExecuting}
            autoFocus
          />
          <button
            type="button"
            className="btn-primary"
            onClick={handleRun}
            disabled={isExecuting || !command.trim()}
            style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
          >
            <Play size={12} />
            <span>Run</span>
          </button>
        </div>
      </div>
    </div>
  );
}
