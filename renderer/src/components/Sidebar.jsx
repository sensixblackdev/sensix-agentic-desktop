import React from 'react';
import {
  Plus,
  Sparkles,
  Archive,
  Trash2,
  Activity,
  Settings,
  FolderKanban,
  FileCode,
  Brain,
  ShieldCheck,
  Cpu,
  Terminal,
  Command,
  Keyboard
} from 'lucide-react';

export function Sidebar({
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onToggleArchive,
  projects = [],
  selectedProject,
  onSelectProject,
  onNewProject,
  onOpenSettings,
  onOpenTelemetry,
  onOpenPalette,
  onOpenShortcuts,
  telemetryErrors = 0,
  connectionStatus = { state: 'idle', label: 'Gateway não configurado', detail: 'Configure uma chave' },
  activeTab = 'chat',
  onSelectTab
}) {
  const filteredSessions = sessions.filter((s) => {
    if (selectedProject === 'all') return true;
    return (s.project || 'Geral') === selectedProject;
  });

  return (
    <aside className="sidebar" aria-label="Navegação do agente">
      <div className="sidebar-top">
        <button
          className="new-session-btn"
          type="button"
          onClick={onNewSession}
          aria-label="Criar nova sessão"
        >
          <Plus size={15} strokeWidth={2} />
          <span>Nova sessão</span>
          <kbd>Ctrl N</kbd>
        </button>

        <div className="project-filter-box">
          <div className="project-filter-head">
            <span>Projeto</span>
            <button type="button" className="text-action-link" onClick={onNewProject}>
              Novo
            </button>
          </div>
          <select
            className="project-filter-select"
            value={selectedProject}
            onChange={(e) => onSelectProject(e.target.value)}
            aria-label="Filtrar por projeto"
          >
            <option value="all">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sidebar-nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => onSelectTab('chat')}
          >
            <Sparkles size={14} />
            <span>Chat Agêntico</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => onSelectTab('files')}
          >
            <FileCode size={14} />
            <span>Arquivos & Código</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'learning' ? 'active' : ''}`}
            onClick={() => onSelectTab('learning')}
          >
            <Brain size={14} />
            <span>Auto-Learning</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => onSelectTab('security')}
          >
            <ShieldCheck size={14} />
            <span>Segurança & Guardrails</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'routing' ? 'active' : ''}`}
            onClick={() => onSelectTab('routing')}
          >
            <Cpu size={14} />
            <span>Roteamento Tiers</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => onSelectTab('terminal')}
          >
            <Terminal size={14} />
            <span>Terminal Seguro</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
            onClick={() => onSelectTab('workspace')}
          >
            <FolderKanban size={14} />
            <span>Workspace & RAG</span>
          </button>
        </div>

        <div className="sidebar-label-row">
          <span className="sidebar-label">Sessões recentes</span>
        </div>

        <div className="session-list" role="list">
          {filteredSessions.map((session) => {
            const isActive = session.id === currentSessionId;
            return (
              <div key={session.id} className="session-row">
                <button
                  type="button"
                  className={`session-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectSession(session.id)}
                  role="listitem"
                >
                  <Sparkles size={13} className="session-spark-icon" />
                  <span className="session-item-title">{session.title || 'Nova sessão'}</span>
                  <span className="session-item-project">{session.project || 'Geral'}</span>
                </button>
                <button
                  type="button"
                  className="session-action-btn"
                  onClick={() => onToggleArchive(session.id)}
                  title={session.archived ? 'Restaurar' : 'Arquivar'}
                  aria-label="Arquivar sessão"
                >
                  <Archive size={13} />
                </button>
                <button
                  type="button"
                  className="session-action-btn danger"
                  onClick={() => onDeleteSession(session.id)}
                  title="Excluir"
                  aria-label="Excluir sessão"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className={`connection-card ${connectionStatus.state}`}>
          <span className="status-dot-pulse" aria-hidden="true"></span>
          <div className="connection-info">
            <strong className="connection-label">{connectionStatus.label}</strong>
            <small className="connection-detail">{connectionStatus.detail}</small>
          </div>
        </div>

        <button
          className="sidebar-link-btn"
          type="button"
          onClick={onOpenTelemetry}
          aria-label="Abrir telemetria e logs"
        >
          <Activity size={15} strokeWidth={1.8} />
          <span>Telemetria & Logs</span>
          {telemetryErrors > 0 && (
            <span className="telemetry-pill">{telemetryErrors}</span>
          )}
        </button>

        <button
          className="sidebar-link-btn"
          type="button"
          onClick={onOpenPalette}
          aria-label="Abrir paleta de comandos"
        >
          <Command size={15} strokeWidth={1.8} />
          <span>Comandos</span>
          <kbd className="sidebar-kbd">Ctrl K</kbd>
        </button>

        <button
          className="sidebar-link-btn"
          type="button"
          onClick={onOpenShortcuts}
          aria-label="Atalhos de teclado"
        >
          <Keyboard size={15} strokeWidth={1.8} />
          <span>Atalhos</span>
        </button>

        <button
          className="sidebar-link-btn"
          type="button"
          onClick={onOpenSettings}
          aria-label="Abrir configurações"
        >
          <Settings size={15} strokeWidth={1.8} />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
}
