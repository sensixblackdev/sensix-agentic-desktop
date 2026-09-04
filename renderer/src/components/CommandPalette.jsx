import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  FolderKanban,
  Activity,
  Terminal,
  ShieldCheck,
  Cpu,
  HelpCircle,
  X,
  FileCode
} from 'lucide-react';

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onTriggerPrompt,
  onOpenSettings
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands = [
    { id: 'nav-chat', label: 'Ir para o Chat Agêntico', category: 'Navegação', icon: Sparkles, action: () => onNavigate('chat') },
    { id: 'nav-files', label: 'Explorador de Arquivos & Código', category: 'Navegação', icon: FileCode, action: () => onNavigate('files') },
    { id: 'nav-learning', label: 'Central de Auto-Learning & Cura', category: 'Navegação', icon: Sparkles, action: () => onNavigate('learning') },
    { id: 'nav-security', label: 'Auditoria de Segurança & Guardrails', category: 'Navegação', icon: ShieldCheck, action: () => onNavigate('security') },
    { id: 'nav-routing', label: 'Matriz de Roteamento de Modelos', category: 'Navegação', icon: Cpu, action: () => onNavigate('routing') },
    { id: 'nav-terminal', label: 'Terminal Integrado Seguro', category: 'Navegação', icon: Terminal, action: () => onNavigate('terminal') },
    { id: 'nav-telemetry', label: 'Telemetria & Logs RFC 7807', category: 'Navegação', icon: Activity, action: () => onNavigate('telemetry') },
    { id: 'nav-workspace', label: 'Diretrizes & Cache RAG', category: 'Navegação', icon: FolderKanban, action: () => onNavigate('workspace') },
    { id: 'action-help', label: 'Executar comando /help no console', category: 'Ações Rápidas', icon: HelpCircle, action: () => onTriggerPrompt?.('/help') },
    { id: 'action-status', label: 'Executar comando /status no console', category: 'Ações Rápidas', icon: Activity, action: () => onTriggerPrompt?.('/status') },
    { id: 'action-settings', label: 'Abrir Configurações do Gateway', category: 'Configurações', icon: Cpu, action: onOpenSettings }
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected) {
        selected.action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette-modal scale-in">
        <div className="palette-search-row">
          <Search size={16} className="text-dim" />
          <input
            ref={inputRef}
            type="text"
            className="palette-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando, página ou ação (Ctrl+K)..."
          />
          <kbd className="palette-esc-kbd">ESC</kbd>
        </div>

        <div className="palette-results-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="palette-empty-notice">Nenhum comando encontrado para "{query}"</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`palette-item-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <Icon size={14} className="palette-item-icon" />
                  <span className="palette-item-label">{item.label}</span>
                  <span className="palette-item-category">{item.category}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="palette-footer-shortcuts">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> selecionar</span>
          <span><kbd>Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
