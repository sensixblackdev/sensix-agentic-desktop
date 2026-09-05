import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ShieldCheck, Zap, Compass, ChevronDown, Check, Sparkles, AlertCircle } from 'lucide-react';

export function ChatHeader({
  models = [],
  selectedModel,
  onSelectModel,
  runMode = 'normal',
  onChangeRunMode,
  actionMode = 'guarded',
  onChangeActionMode
}) {
  const [modelOpen, setModelOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const modelRef = useRef(null);
  const modeRef = useRef(null);
  const accessRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (modelRef.current && !modelRef.current.contains(e.target)) setModelOpen(false);
      if (modeRef.current && !modeRef.current.contains(e.target)) setModeOpen(false);
      if (accessRef.current && !accessRef.current.contains(e.target)) setAccessOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeModelObj = models.find((m) => m.id === selectedModel) || {
    id: selectedModel || 'auto',
    name: (selectedModel === 'auto' || !selectedModel) ? '✨ Auto (Primário · Anti-Refusal)' : selectedModel
  };

  const filteredModels = models.filter((m) =>
    (m.name || m.id || m.description || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  const modeOptions = [
    { id: 'normal', label: 'Normal (ReAct)', desc: 'Autônomo com chamada contínua de ferramentas' },
    { id: 'plan', label: 'Modo Plan', desc: 'Gera plano estruturado antes de executar' },
    { id: 'driven', label: 'Driven Code', desc: 'Foco exclusivo em geração e testes de código' }
  ];

  const accessOptions = [
    { id: 'guarded', label: 'Guarded', desc: 'Bloqueio estrito de comandos destrutivos e Vault' },
    { id: 'full-access', label: 'Full Access', desc: 'Execução estendida com confirmação ativa' }
  ];

  return (
    <header className="chat-header">
      {/* ─── Custom Model Selector ─── */}
      <div className="model-picker-area" ref={modelRef}>
        <button
          type="button"
          className="custom-select-trigger"
          onClick={() => {
            setModelOpen(!modelOpen);
            setModeOpen(false);
            setAccessOpen(false);
            setSearchFilter('');
          }}
          aria-haspopup="listbox"
          aria-expanded={modelOpen}
        >
          <Cpu size={14} className="text-accent" />
          <span className="selected-model-text" title={activeModelObj.id}>
            {activeModelObj.name || activeModelObj.id}
          </span>
          <ChevronDown size={12} className={`trigger-chevron ${modelOpen ? 'open' : ''}`} />
        </button>

        {modelOpen && (
          <div className="custom-dropdown-popover scale-in" role="listbox">
            <div className="popover-search-box">
              <input
                type="text"
                className="popover-search-input"
                placeholder="Filtrar modelos de IA..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                autoFocus
              />
            </div>
            <div className="popover-options-list">
              {filteredModels.length === 0 ? (
                <div className="popover-empty-notice">Nenhum modelo encontrado.</div>
              ) : (
                filteredModels.map((m) => {
                  const isSelected = m.id === selectedModel;
                  const isUncensored = m.id?.includes('uncensored') || m.id?.includes('abliterated') || m.id?.includes('venice');
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`popover-option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectModel(m.id);
                        setModelOpen(false);
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="option-main-row">
                        <span className="option-name">{m.id === 'auto' ? '✨ Auto (Anti-Refusal)' : (m.name || m.id)}</span>
                        {m.id === 'auto' && (
                          <span className="badge badge-accent" style={{ fontSize: 9, padding: '1px 5px' }}>
                            PRIMÁRIO · ANTI-REFUSAL
                          </span>
                        )}
                        {isSelected && <Check size={13} className="text-accent check-icon" />}
                      </div>
                      {m.description && <span className="option-desc">{m.description}</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Mode & Access Controls ─── */}
      <div className="header-controls-area">
        <div className="mode-pill-group">
          {/* Run Mode Selector */}
          <div className="control-popover-wrapper" ref={modeRef}>
            <button
              type="button"
              className="control-pill-btn"
              onClick={() => {
                setModeOpen(!modeOpen);
                setModelOpen(false);
                setAccessOpen(false);
              }}
              title="Modo de Operação"
            >
              <Compass size={13} className="text-muted" />
              <span>{modeOptions.find((o) => o.id === runMode)?.label || runMode}</span>
              <ChevronDown size={11} className={`trigger-chevron ${modeOpen ? 'open' : ''}`} />
            </button>

            {modeOpen && (
              <div className="custom-dropdown-popover mode-popover scale-in">
                {modeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`popover-option-item ${runMode === opt.id ? 'selected' : ''}`}
                    onClick={() => {
                      onChangeRunMode(opt.id);
                      setModeOpen(false);
                    }}
                  >
                    <div className="option-main-row">
                      <span className="option-name">{opt.label}</span>
                      {runMode === opt.id && <Check size={13} className="text-accent check-icon" />}
                    </div>
                    <span className="option-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Mode Selector */}
          <div className="control-popover-wrapper" ref={accessRef}>
            <button
              type="button"
              className="control-pill-btn"
              onClick={() => {
                setAccessOpen(!accessOpen);
                setModelOpen(false);
                setModeOpen(false);
              }}
              title="Nível de Permissão & Guardrails"
            >
              <ShieldCheck size={13} className={actionMode === 'full-access' ? 'text-warning' : 'text-accent'} />
              <span>{accessOptions.find((o) => o.id === actionMode)?.label || actionMode}</span>
              <ChevronDown size={11} className={`trigger-chevron ${accessOpen ? 'open' : ''}`} />
            </button>

            {accessOpen && (
              <div className="custom-dropdown-popover mode-popover scale-in">
                {accessOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`popover-option-item ${actionMode === opt.id ? 'selected' : ''}`}
                    onClick={() => {
                      onChangeActionMode(opt.id);
                      setAccessOpen(false);
                    }}
                  >
                    <div className="option-main-row">
                      <span className="option-name">{opt.label}</span>
                      {actionMode === opt.id && <Check size={13} className="text-accent check-icon" />}
                    </div>
                    <span className="option-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
