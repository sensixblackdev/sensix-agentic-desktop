import React, { useState, useEffect } from 'react';
import { FolderKanban, BookOpen, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function WorkspacePage({ session }) {
  const [rules, setRules] = useState(null);
  const [ragStats, setRagStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await window.sensix?.getProjectRules?.(session?.projectFolder || '.');
      setRules(r);
      const s = await window.sensix?.getDirectivesStats?.();
      setRagStats(s);
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao carregar dados do workspace', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleInitRules = async () => {
    try {
      const res = await window.sensix?.initProjectRules?.(session?.projectFolder || '.');
      if (res.ok) {
        addToast({ type: 'success', title: 'Diretrizes Criadas', message: `Arquivo ${res.path} gerado com sucesso.` });
        loadData();
      } else {
        addToast({ type: 'warning', title: 'Aviso', message: res.error });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Falha ao inicializar regras', message: err.message });
    }
  };

  return (
    <div className="workspace-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <FolderKanban size={18} className="text-accent" />
          <h2>Workspace & Diretrizes de Engenharia (RAG)</h2>
        </div>

        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Atualizar</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleInitRules}>
            <Sparkles size={14} />
            <span>Inicializar AGENTS.md</span>
          </button>
        </div>
      </header>

      <div className="telemetry-stats-bar">
        <div className="stat-card">
          <span className="stat-label">Cache Hits RAG</span>
          <strong className="stat-value text-accent">{ragStats?.cacheHits || 0}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Latência em Memória</span>
          <strong className="stat-value">&lt; 0.1 ms</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tokens Comprimidos</span>
          <strong className="stat-value">~{rules?.tokenEstimate || 250} tok</strong>
        </div>
      </div>

      <div className="rules-view-container">
        <div className="rules-card-header">
          <BookOpen size={16} className="text-accent" />
          <span>Diretrizes em Uso: {rules?.file || 'Nenhuma detectada'}</span>
        </div>
        <pre className="rules-content-pre">
          <code>{rules?.content || 'Nenhum arquivo de diretrizes encontrado na raiz. Clique em "Inicializar AGENTS.md" para criar.'}</code>
        </pre>
      </div>
    </div>
  );
}
