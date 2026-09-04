import React, { useState } from 'react';
import { Cpu, Zap, Activity, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';

export function InferenceRoutingPage({ models = [], selectedModel }) {
  const tiers = [
    { tier: 'Tier 1 (Local)', provider: 'Ollama / Local LLM', desc: 'Latência zero, privacidade total, ideal para edições offline.', latency: '<10ms' },
    { tier: 'Tier 2 (Uncensored)', provider: 'OpenRouter Uncensored Tool Models', desc: 'Execução ReAct com tool calls nativas e sem recusas morais.', latency: '~250ms' },
    { tier: 'Tier 3 (Enterprise)', provider: 'Claude 3.7 / GPT-4o / DeepSeek-V3', desc: 'Raciocínio complexo, refatorações em lote e arquitetura.', latency: '~450ms' }
  ];

  return (
    <div className="routing-page-layout fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <Cpu size={18} className="text-accent" />
          <h2>Matriz de Roteamento de Inferência & Tiers</h2>
        </div>
      </header>

      <div className="telemetry-stats-bar">
        <MetricCard label="Modelos Disponíveis" value={models.length} sublabel="Catálogo conectado ao gateway" icon={Cpu} variant="accent" />
        <MetricCard label="Fallback Automático" value="Ativo" sublabel="Transição contra refusals" icon={Zap} variant="success" />
        <MetricCard label="Modelo Selecionado" value={selectedModel ? selectedModel.split('/').pop() : 'Nenhum'} sublabel="Pronto para execução" icon={Activity} />
      </div>

      <div className="tiers-container">
        <h3 className="section-subtitle">Hierarquia de Execução de Inferência</h3>
        <div className="tiers-grid">
          {tiers.map((t, idx) => (
            <div key={idx} className="tier-card">
              <div className="tier-card-head">
                <span className="tier-pill">{t.tier}</span>
                <span className="tier-latency">{t.latency}</span>
              </div>
              <strong className="tier-provider">{t.provider}</strong>
              <p className="tier-desc">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
