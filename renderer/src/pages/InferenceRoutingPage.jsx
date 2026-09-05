import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, Cpu, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { useToast } from '../context/ToastContext';

const FALLBACK_CHAIN = [
  { id: 'auto', label: 'Auto (Roteamento Dinâmico)', type: 'meta', status: 'active' },
  { id: 'agentic-primary', label: 'Primary (Mistral Devstral 2)', type: 'agentic', status: 'standby' },
  { id: 'fast-secondary', label: 'Secondary (Codestral / DeepSeek)', type: 'coding', status: 'standby' },
];

export function InferenceRoutingPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState('auto');
  const { addToast } = useToast();

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await window.sensix?.listModels?.();
      if (Array.isArray(data)) setModels(data);
      else if (data?.models) setModels(data.models);
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao carregar modelos', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadModels(); }, []);

  const uncensored = models.filter(m => m.id?.includes('uncensored') || m.id?.includes('abliterated') || m.id?.includes('command-r'));
  const censored = models.filter(m => !uncensored.includes(m));

  return (
    <div className="inference-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <Network size={18} className="text-accent" />
          <h2>Roteamento de Inferência & Seleção de Modelos</h2>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={loadModels} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <div className="telemetry-stats-bar">
        <MetricCard label="Modelos Disponíveis" value={models.length || '—'} sublabel="100% Tool Call Nativo" icon={Cpu} variant="accent" />
        <MetricCard label="Filtro Ativo" value="Strict Native" sublabel="Zero pseudo-tools" icon={Zap} variant="warning" />
        <MetricCard label="Rota Ativa" value="Auto" sublabel="Seleção inteligente" icon={CheckCircle2} variant="success" />
      </div>

      <div className="routing-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, padding: '0 16px 16px' }}>
        <div className="routing-chain-panel">
          <div className="lessons-table-header" style={{ marginBottom: 8 }}>
            <Network size={13} className="text-accent" />
            <span>Cadeia de Fallback</span>
          </div>
          {FALLBACK_CHAIN.map((route) => (
            <button
              key={route.id}
              type="button"
              onClick={() => setActiveRoute(route.id)}
              className="routing-chain-item"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '10px 12px', marginBottom: 6, borderRadius: 6, cursor: 'pointer',
                background: activeRoute === route.id ? 'rgba(59,130,246,0.12)' : 'var(--bg-surface-1)',
                border: `1px solid ${activeRoute === route.id ? 'rgba(59,130,246,0.4)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)'
              }}
            >
              {route.type === 'meta' ? <Zap size={14} color="#38bdf8" /> :
               route.type === 'uncensored' ? <AlertCircle size={14} color="#f59e0b" /> :
               <CheckCircle2 size={14} color="#10b981" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{route.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                  {route.status === 'active' ? 'Em uso' : 'Standby'}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="models-list-panel">
          <div className="lessons-table-header" style={{ marginBottom: 8 }}>
            <Cpu size={13} className="text-accent" />
            <span>Modelos Disponíveis ({models.length})</span>
          </div>
          {loading ? (
            <div className="skeleton-loader" style={{ height: 200, borderRadius: 8 }} />
          ) : models.length === 0 ? (
            <div className="empty-state-notice">
              <Cpu size={32} className="text-dim mb-2" />
              <p>Configure a API Key em Configurações para listar modelos disponíveis.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              {models.map((m, i) => (
                <div key={i} className="model-row" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--bg-surface-1)', borderRadius: 6,
                  border: '1px solid var(--border-subtle)'
                }}>
                  {(m.id?.includes('uncensored') || m.id?.includes('abliterated')) ?
                    <AlertCircle size={13} color="#f59e0b" /> : <CheckCircle2 size={13} color="#10b981" />}
                  <span style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {m.id || m.name || m}
                  </span>
                  {(m.id?.includes('uncensored') || m.id?.includes('abliterated')) && (
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>uncensored</span>
                  )}
                  {m.context_length && (
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{(m.context_length/1000).toFixed(0)}k ctx</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
