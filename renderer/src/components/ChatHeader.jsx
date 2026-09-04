import React from 'react';
import { Cpu, ShieldCheck, Zap, Compass, PlayCircle } from 'lucide-react';

export function ChatHeader({
  models = [],
  selectedModel,
  onSelectModel,
  runMode,
  onChangeRunMode,
  actionMode,
  onChangeActionMode
}) {
  return (
    <header className="chat-header">
      <div className="model-picker-area">
        <div className="model-select-wrapper">
          <Cpu size={14} className="text-accent" />
          <select
            className="model-select-dropdown"
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            aria-label="Selecionar modelo de IA"
          >
            {models.length === 0 ? (
              <option value="">Carregando modelos...</option>
            ) : (
              models.map((m) => (
                <option key={m.id} value={m.id} title={m.description}>
                  {m.name || m.id}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="header-controls-area">
        <div className="mode-pill-group">
          <label className="mode-label" title="Modo de Operação">
            <Compass size={13} className="text-muted" />
            <select
              className="mode-select"
              value={runMode}
              onChange={(e) => onChangeRunMode(e.target.value)}
              aria-label="Modo de execução"
            >
              <option value="normal">Normal (ReAct)</option>
              <option value="plan">Modo Plan</option>
              <option value="driven">Driven Code</option>
            </select>
          </label>

          <label className="mode-label" title="Controle de Acesso ao Sistema">
            <ShieldCheck size={13} className={actionMode === 'full-access' ? 'text-accent' : 'text-dim'} />
            <select
              className="mode-select"
              value={actionMode}
              onChange={(e) => onChangeActionMode(e.target.value)}
              aria-label="Nível de permissão"
            >
              <option value="guarded">Guarded</option>
              <option value="full-access">Full Access</option>
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}
