import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Trash2, Folder, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function TelemetryPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalEvents: 0, errors: 0, warnings: 0, info: 0 });
  const { addToast } = useToast();

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const data = await window.sensix?.getTelemetryEvents?.();
      if (data && Array.isArray(data.events)) {
        setEvents(data.events.slice(-100).reverse());
        setStats(data.stats || { totalEvents: data.events.length });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao carregar telemetria', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, []);

  const handleClear = async () => {
    try {
      await window.sensix?.clearTelemetry?.();
      setEvents([]);
      addToast({ type: 'success', title: 'Logs Limpos', message: 'Histórico de telemetria resetado com sucesso.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao limpar logs', message: err.message });
    }
  };

  return (
    <div className="telemetry-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <Activity size={18} className="text-accent" />
          <h2>Telemetria Industrial & Logs de Auditoria</h2>
        </div>

        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={loadTelemetry} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Atualizar</span>
          </button>
          <button type="button" className="btn-secondary danger" onClick={handleClear}>
            <Trash2 size={14} />
            <span>Limpar Logs</span>
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.sensix?.openLogsFolder?.()}>
            <Folder size={14} />
            <span>Abrir Pasta de Logs</span>
          </button>
        </div>
      </header>

      <div className="telemetry-stats-bar">
        <div className="stat-card">
          <span className="stat-label">Total de Eventos</span>
          <strong className="stat-value">{events.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Erros Detectados</span>
          <strong className="stat-value text-danger">{events.filter((e) => e.level === 'error').length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avisos & Retries</span>
          <strong className="stat-value text-warning">{events.filter((e) => e.level === 'warn').length}</strong>
        </div>
      </div>

      <div className="telemetry-list-area">
        {events.length === 0 ? (
          <div className="empty-state-notice">
            <Activity size={32} className="text-dim mb-2" />
            <p>Nenhum evento registrado ainda. Logs de execução e chamadas de API aparecerão aqui.</p>
          </div>
        ) : (
          events.map((ev, idx) => (
            <article key={idx} className={`telemetry-item-card level-${ev.level || 'info'}`}>
              <div className="telemetry-item-header">
                <span className={`telemetry-badge badge-${ev.level || 'info'}`}>{ev.level || 'info'}</span>
                <span className="telemetry-type">{ev.type}</span>
                <span className="telemetry-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="telemetry-item-body">
                <pre>{JSON.stringify(ev.data || {}, null, 2)}</pre>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
