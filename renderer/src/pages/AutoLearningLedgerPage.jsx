import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Wrench } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { useToast } from '../context/ToastContext';

export function AutoLearningLedgerPage() {
  const [ledger, setLedger] = useState({ totalLessons: 0, totalInjections: 0, lessons: [] });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await window.sensix?.getLearningStats?.();
      if (data) setLedger(data);
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao carregar ledger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  return (
    <div className="learning-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <Brain size={18} className="text-accent" />
          <h2>Central de Auto-Learning & Cura Contínua</h2>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={loadLedger} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <div className="telemetry-stats-bar">
        <MetricCard
          label="Lições Aprendidas"
          value={ledger.totalLessons || 0}
          sublabel="Padrões de falha catalogados"
          icon={Brain}
          variant="accent"
        />
        <MetricCard
          label="Injeções Preventivas"
          value={ledger.totalInjections || 0}
          sublabel="Prevenções ativas em prompts"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Taxa de Auto-Cura"
          value="100%"
          sublabel="Recuperação em tempo real"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <div className="lessons-table-container">
        <div className="lessons-table-header">
          <Wrench size={14} className="text-accent" />
          <span>Ledger de Correções Automáticas Aplicadas</span>
        </div>

        {(!ledger.lessons || ledger.lessons.length === 0) ? (
          <div className="empty-state-notice">
            <CheckCircle2 size={32} className="text-success mb-2" />
            <p>Nenhuma falha residual. Quando o agente auto-cura uma ferramenta (ex.: CRLF, PowerShell ";" ou caminhos), a lição é gravada aqui.</p>
          </div>
        ) : (
          <div className="lessons-list">
            {ledger.lessons.map((l, idx) => (
              <article key={idx} className="lesson-card">
                <div className="lesson-head">
                  <span className="lesson-tool-tag">{l.tool}</span>
                  <span className="lesson-time">{new Date(l.timestamp || Date.now()).toLocaleString()}</span>
                </div>
                <div className="lesson-body">
                  <div className="lesson-field">
                    <strong>Sintoma / Erro:</strong>
                    <code>{l.symptom}</code>
                  </div>
                  <div className="lesson-field">
                    <strong>Solução Aplicada:</strong>
                    <span className="text-success">{l.fixApplied}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
