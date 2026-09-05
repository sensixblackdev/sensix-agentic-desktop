import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Play, X, Zap, CheckCircle2, Wrench, Shield, Bug, FileText } from 'lucide-react';

const PRESETS = [
  { id: 'refactor', label: 'Refatorar', prompt: 'Refatore este código para melhorar legibilidade, desacoplamento e manter a performance máxima.', icon: Wrench },
  { id: 'optimize', label: 'Otimizar', prompt: 'Otimize a complexidade de tempo e memória deste código eliminando gargalos.', icon: Zap },
  { id: 'tests', label: 'Testes', prompt: 'Escreva uma suíte completa de testes unitários automatizados para cobrir todos os fluxos e edge cases deste código.', icon: CheckCircle2 },
  { id: 'types', label: 'Tipagem/Doc', prompt: 'Adicione anotações de tipagem e documentação técnica JSDoc clara em todas as funções e parâmetros.', icon: FileText },
  { id: 'debug', label: 'Corrigir Bugs', prompt: 'Analise e corrija potenciais bugs de concorrência, exceções não tratadas e vazamentos de memória.', icon: Bug }
];

export function AIInlineAssistant({
  isOpen,
  onClose,
  onSubmit,
  isGenerating = false,
  selectedModel,
  onSelectModel,
  models = [],
  filePath = ''
}) {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        onSubmit(prompt.trim());
      }
    }
  };

  const handleApplyPreset = (presetPrompt) => {
    setPrompt(presetPrompt);
    inputRef.current?.focus();
  };

  return (
    <div className="ai-inline-assistant-panel fade-in" role="dialog" aria-label="Assistente IA da IDE">
      <div className="ai-inline-header">
        <div className="ai-inline-badge">
          <Sparkles size={13} className="text-accent" />
          <span>SENSIX AI Code Engine</span>
          <span className="ai-inline-file-tag">{filePath.split(/[\\/]/).pop() || 'Arquivo'}</span>
        </div>

        <div className="ai-inline-controls">
          <select
            className="ai-model-select"
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            disabled={isGenerating}
            title="Selecionar Modelo de Alta Performance"
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id.split('/').pop()} · {m.ownedBy || 'AI'}
                </option>
              ))
            ) : (
              <>
                <option value="cognitivecomputations/dolphin-mistral-24b-venice-edition">Dolphin-Mistral 24B (Ultra-rápido)</option>
                <option value="nousresearch/hermes-3-llama-3.1-70b">Hermes-3 70B (Raciocínio Profundo)</option>
                <option value="nousresearch/hermes-4-70b">Hermes-4 70B (Orquestração)</option>
              </>
            )}
          </select>

          <button
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Fechar assistente"
            disabled={isGenerating}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="ai-inline-input-row">
        <input
          ref={inputRef}
          type="text"
          className="ai-inline-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Instrução para a IA (ex: 'Otimize este algoritmo', 'Adicione tratamento com try/catch')... Enter para executar"
          disabled={isGenerating}
        />
        <button
          type="button"
          className="btn-primary ai-inline-run-btn"
          onClick={() => prompt.trim() && onSubmit(prompt.trim())}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner-inline" />
              <span>Gerando...</span>
            </>
          ) : (
            <>
              <Play size={12} />
              <span>Gerar (Enter)</span>
            </>
          )}
        </button>
      </div>

      <div className="ai-inline-presets-row">
        <span className="presets-label">Ações rápidas:</span>
        {PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              className="preset-chip"
              onClick={() => handleApplyPreset(p.prompt)}
              disabled={isGenerating}
            >
              <Icon size={11} className="text-dim" />
              <span>{p.label}</span>
            </button>
          );
        })}
        <span className="ai-inline-hint">Esc para fechar · Ctrl+I reabre</span>
      </div>
    </div>
  );
}
