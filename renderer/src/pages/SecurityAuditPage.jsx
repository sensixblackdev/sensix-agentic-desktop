import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { useToast } from '../context/ToastContext';

export function SecurityAuditPage() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState(null);
  const { addToast } = useToast();

  const runAudit = async () => {
    setLoading(true);
    try {
      const result = await window.sensix?.runSecurityAudit?.();
      if (!Array.isArray(result?.checks)) throw new Error('O backend não retornou checks de segurança válidos.');
      setChecks(result.checks);
      setScannedAt(new Date(result.scannedAt).toLocaleString());
      const failures = result.checks.filter((check) => check.status === 'fail').length;
      addToast({
        type: failures > 0 ? 'error' : 'success',
        title: 'Auditoria concluída',
        message: `${result.checks.length} checks reais verificados; ${failures} falha(s).`
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Erro na auditoria', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runAudit(); }, []);

  const passed = checks.filter(c => c.status === 'pass').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  const failed = checks.filter(c => c.status === 'fail').length;

  return (
    <div className="security-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <ShieldCheck size={18} className="text-accent" />
          <h2>Auditoria de Segurança</h2>
          {scannedAt && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Escaneado: {scannedAt}</span>}
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={runAudit} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Re-auditar</span>
          </button>
        </div>
      </header>

      <div className="telemetry-stats-bar">
        <MetricCard label="Aprovados" value={passed} sublabel="Checks OK" icon={CheckCircle2} variant="success" />
        <MetricCard label="Avisos" value={warned} sublabel="Atenção recomendada" icon={AlertTriangle} variant="warning" />
        <MetricCard label="Falhas" value={failed} sublabel="Ação necessária" icon={ShieldAlert} variant="danger" />
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map((check) => (
          <div key={check.id} className="security-check-row" style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 14px',
            background: 'var(--bg-surface-1)', borderRadius: 8,
            border: `1px solid ${check.status === 'pass' ? 'rgba(16,185,129,0.2)' : check.status === 'warn' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              {check.status === 'pass' && <CheckCircle2 size={16} color="#10b981" />}
              {check.status === 'warn' && <AlertTriangle size={16} color="#f59e0b" />}
              {check.status === 'fail' && <ShieldAlert size={16} color="#ef4444" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>
                {check.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {check.detail}
              </div>
            </div>
            <div>
              <span className={`badge badge-${check.status === 'pass' ? 'success' : check.status === 'warn' ? 'warning' : 'danger'}`}
                style={{ fontSize: 10 }}>
                {check.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
