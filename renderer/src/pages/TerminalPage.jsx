import React, { useState } from 'react';
import { Terminal, Play, Trash2, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function TerminalPage() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([
    { cmd: 'Get-ChildItem -Path . | Select-Object -First 5 Name', output: 'main.cjs\npreload.cjs\nrenderer\npackage.json\nREADME.md', code: 0 }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { addToast } = useToast();

  const handleRun = async (e) => {
    e?.preventDefault();
    if (!command.trim() || isExecuting) return;

    const cmdToRun = command.trim();
    setIsExecuting(true);
    try {
      const res = await window.sensix?.executeCommand?.(cmdToRun);
      const output = res?.stdout || res?.stderr || (res?.code === 0 ? '[Executado com sucesso sem saída]' : '[Erro na execução]');
      setHistory((prev) => [...prev, { cmd: cmdToRun, output, code: res?.code || 0 }]);
      setCommand('');
    } catch (err) {
      setHistory((prev) => [...prev, { cmd: cmdToRun, output: `Erro: ${err.message}`, code: 1 }]);
      addToast({ type: 'error', title: 'Falha no comando', message: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="terminal-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <Terminal size={18} className="text-accent" />
          <h2>Terminal Integrado PowerShell (Guardrail Protected)</h2>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setHistory([])}>
            <Trash2 size={14} />
            <span>Limpar Histórico</span>
          </button>
        </div>
      </header>

      <div className="terminal-console-output">
        {history.map((item, idx) => (
          <div key={idx} className="terminal-entry">
            <div className="terminal-prompt-line">
              <span className="terminal-prompt-sym">PS D:\WORKSPACE&gt;</span>
              <strong className="terminal-cmd-text">{item.cmd}</strong>
            </div>
            <pre className={`terminal-output-pre ${item.code !== 0 ? 'text-danger' : ''}`}>
              <code>{item.output}</code>
            </pre>
          </div>
        ))}
      </div>

      <form className="terminal-input-bar" onSubmit={handleRun}>
        <span className="terminal-prompt-sym">PS&gt;</span>
        <input
          type="text"
          className="terminal-command-input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Digite um comando PowerShell seguro..."
          disabled={isExecuting}
        />
        <button type="submit" className="btn-primary" disabled={isExecuting || !command.trim()}>
          <Play size={13} />
          <span>{isExecuting ? 'Executando...' : 'Executar'}</span>
        </button>
      </form>
    </div>
  );
}
