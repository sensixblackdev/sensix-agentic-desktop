import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Terminal, RefreshCw, CheckCircle2 } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';

export function SecurityAuditPage() {
  const guardrules = [
    { rule: 'Bloqueio de Comandos Destrutivos', status: 'Ativo', desc: 'Prevenção contra rm -rf, format, diskpart, shutdown e git reset --hard.' },
    { rule: 'Isolamento de Credenciais (.env / Vault)', status: 'Ativo', desc: 'Leitura ou exibição de tokens em SECURE/VAULT e arquivos .env são suprimidas.' },
    { rule: 'Chaves Privadas SSH (id_rsa, id_ed25519)', status: 'Ativo', desc: 'Acesso a diretórios ~/.ssh e chaves criptográficas locais é estritamente bloqueado.' },
    { rule: 'Workspace Containment (D:\WORKSPACE)', status: 'Ativo', desc: 'Qualquer tentativa de navegação fora da raiz canônica é contida e normalizada.' },
    { rule: 'Sanitização de Stdin Interativo', status: 'Ativo', desc: 'Execuções de processos evitam travas de prompts suspensos no PowerShell.' }
  ];

  return (
    <div className="security-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <ShieldCheck size={18} className="text-accent" />
          <h2>Auditoria de Segurança & Guardrails Industriais</h2>
        </div>
      </header>

      <div className="telemetry-stats-bar">
        <MetricCard label="Guardrails Ativos" value="5/5" sublabel="Zero vazamentos de Vault" icon={ShieldCheck} variant="success" />
        <MetricCard label="Tentativas Bloqueadas" value="0" sublabel="Comandos destrutivos contidos" icon={ShieldAlert} />
        <MetricCard label="Modo Atual" value="Guarded" sublabel="Permissão restrita ao workspace" icon={Lock} variant="accent" />
      </div>

      <div className="guardrails-table-wrapper">
        <div className="rules-card-header">
          <Lock size={14} className="text-accent" />
          <span>Políticas de Segurança em Tempo de Execução</span>
        </div>

        <div className="guardrails-list">
          {guardrules.map((g, idx) => (
            <div key={idx} className="guardrail-item">
              <div className="guardrail-status-col">
                <CheckCircle2 size={16} className="text-success" />
                <strong>{g.rule}</strong>
              </div>
              <p className="guardrail-desc">{g.desc}</p>
              <span className="guardrail-badge-active">{g.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
