import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Play, RotateCcw, Square, Terminal, Trash2, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const OUTPUT_LIMIT = 1024 * 1024;

function cleanTerminalOutput(value) {
  return String(value || '')
    .replace(/\x1B\][^\x07]*(?:\x07|\x1B\\)/g, '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r(?!\n)/g, '');
}

export function TerminalPage() {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [sessionState, setSessionState] = useState('starting');
  const [sessionMeta, setSessionMeta] = useState(null);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const [copied, setCopied] = useState(false);
  const sessionRef = useRef(null);
  const outputRef = useRef(null);
  const inputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    let disposed = false;
    const removeListener = window.sensix?.onTerminalEvent?.((event) => {
      if (sessionRef.current && event.sessionId !== sessionRef.current) return;
      if (event.type === 'data') {
        const chunk = cleanTerminalOutput(event.data);
        setOutput((current) => `${current}${chunk}`.slice(-OUTPUT_LIMIT));
      } else if (event.type === 'exit') {
        setSessionState('exited');
      }
    });

    window.sensix?.createTerminalSession?.({ cols: 120, rows: 30 }).then((session) => {
      if (disposed) {
        window.sensix?.stopTerminalSession?.(session.sessionId);
        return;
      }
      sessionRef.current = session.sessionId;
      setSessionMeta(session);
      setSessionState('running');
      inputRef.current?.focus();
    }).catch((error) => {
      setSessionState('failed');
      setOutput((current) => `${current}\nFalha ao iniciar ConPTY: ${error.message}\n`);
      addToast({ type: 'error', title: 'Terminal indisponível', message: error.message });
    });

    return () => {
      disposed = true;
      removeListener?.();
      if (sessionRef.current) window.sensix?.stopTerminalSession?.(sessionRef.current);
      sessionRef.current = null;
    };
  }, [addToast]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const write = async (data) => {
    if (!sessionRef.current || sessionState !== 'running') return;
    await window.sensix?.writeTerminalSession?.({ sessionId: sessionRef.current, data });
  };

  const handleRun = async (event) => {
    event?.preventDefault();
    if (!command.trim() || sessionState !== 'running') return;
    const cmdToRun = command;
    setCmdHistory((previous) => [cmdToRun, ...previous.filter((item) => item !== cmdToRun).slice(0, 49)]);
    setCmdIdx(-1);
    setCommand('');
    try {
      await write(`${cmdToRun}\r`);
    } catch (error) {
      addToast({ type: 'error', title: 'Falha ao enviar comando', message: error.message });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleRun(event);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.min(cmdIdx + 1, cmdHistory.length - 1);
      setCmdIdx(next);
      setCommand(cmdHistory[next] || '');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.max(cmdIdx - 1, -1);
      setCmdIdx(next);
      setCommand(next === -1 ? '' : cmdHistory[next]);
    } else if (event.key.toLowerCase() === 'c' && event.ctrlKey) {
      event.preventDefault();
      write('\x03');
    }
  };

  const restart = async () => {
    if (sessionRef.current) await window.sensix?.stopTerminalSession?.(sessionRef.current);
    sessionRef.current = null;
    setOutput('');
    setSessionState('starting');
    try {
      const session = await window.sensix?.createTerminalSession?.({ cols: 120, rows: 30 });
      sessionRef.current = session.sessionId;
      setSessionMeta(session);
      setSessionState('running');
    } catch (error) {
      setSessionState('failed');
      addToast({ type: 'error', title: 'Falha ao reiniciar', message: error.message });
    }
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="terminal-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <Terminal size={18} className="text-accent" />
          <h2>Terminal Agentic ConPTY</h2>
          <span className="badge badge-warning" title="Sessão PowerShell persistente com stdin e acesso integral"><Zap size={11} /> Acesso Total</span>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={() => write('\x03')} disabled={sessionState !== 'running'} title="Interromper processo atual"><Square size={13} /><span>Ctrl+C</span></button>
          <button type="button" className="btn-secondary" onClick={restart}><RotateCcw size={13} /><span>Reiniciar</span></button>
          <button type="button" className="btn-secondary" onClick={() => setOutput('')}><Trash2 size={14} /><span>Limpar</span></button>
        </div>
      </header>

      <div className="terminal-window" style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
        <div className="terminal-header">
          <div className="terminal-dots"><span className="terminal-dot red" /><span className="terminal-dot yellow" /><span className="terminal-dot green" /></div>
          <span className={`terminal-session-state ${sessionState}`}>{sessionState} {sessionMeta?.pid ? `• PID ${sessionMeta.pid}` : ''}</span>
        </div>
        <div className="terminal-output" ref={outputRef} style={{ flex: 1 }}>
          <div className="terminal-entry">
            <button type="button" className="terminal-copy-button" onClick={copyOutput} title="Copiar saída">{copied ? <Check size={12} /> : <Copy size={12} />}</button>
            <pre className="terminal-stream-output">{output || (sessionState === 'starting' ? 'Iniciando sessão ConPTY…' : '')}</pre>
          </div>
        </div>
        <form className="terminal-prompt-line" onSubmit={handleRun}>
          <span className="terminal-prompt-symbol">PS&gt;</span>
          <input ref={inputRef} type="text" className="terminal-input" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={handleKeyDown} placeholder="Digite um comando PowerShell... (↑↓ histórico, Ctrl+C interrompe)" disabled={sessionState !== 'running'} autoFocus />
          <button type="submit" className="btn-primary" disabled={sessionState !== 'running' || !command.trim()} style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}><Play size={12} /><span>Executar</span></button>
        </form>
      </div>
    </div>
  );
}
