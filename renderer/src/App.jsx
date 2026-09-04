import React, { useState, useEffect } from 'react';
import { WindowBar } from './components/WindowBar';
import { Sidebar } from './components/Sidebar';

// Pages
import { ChatPage } from './pages/ChatPage';
import { FileExplorerPage } from './pages/FileExplorerPage';
import { AutoLearningLedgerPage } from './pages/AutoLearningLedgerPage';
import { SecurityAuditPage } from './pages/SecurityAuditPage';
import { InferenceRoutingPage } from './pages/InferenceRoutingPage';
import { TerminalPage } from './pages/TerminalPage';
import { TelemetryPage } from './pages/TelemetryPage';
import { WorkspacePage } from './pages/WorkspacePage';

// Modals & Floating Components
import { SettingsModal } from './components/SettingsModal';
import { ProjectModal } from './components/ProjectModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { PromptTemplatesModal } from './components/PromptTemplatesModal';
import { ToastContainer } from './components/ToastContainer';
import { ToastProvider, useToast } from './context/ToastContext';

function AppContent() {
  const [sessions, setSessions] = useState([
    { id: 'session_default', title: 'Sessão Principal', project: 'Geral', messages: [], todos: [] }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState('session_default');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [activeTab, setActiveTab] = useState('chat');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [runMode, setRunMode] = useState('normal');
  const [actionMode, setActionMode] = useState('guarded');

  // Modals & Drawers
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({});
  const { addToast } = useToast();

  useEffect(() => {
    async function initialize() {
      try {
        const loadedSessions = await window.sensix?.loadSessions?.();
        if (Array.isArray(loadedSessions) && loadedSessions.length > 0) {
          setSessions(loadedSessions);
          setCurrentSessionId(loadedSessions[0].id);
        }
        const s = await window.sensix?.getSettings?.();
        if (s) setSettingsData(s);
        const m = await window.sensix?.listModels?.();
        if (Array.isArray(m) && m.length > 0) {
          setModels(m);
          setSelectedModel(m[0].id);
        }
      } catch (err) {
        console.error('Falha na inicialização:', err);
      }
    }
    initialize();

    // Global shortcut Ctrl+K
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];

  const handleUpdateSession = (updated) => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      window.sensix?.saveSessions?.(next);
      return next;
    });
  };

  const handleNewSession = () => {
    const newSess = {
      id: 'session_' + Date.now(),
      title: 'Nova sessão',
      project: selectedProject === 'all' ? 'Geral' : selectedProject,
      messages: [],
      todos: []
    };
    setSessions((prev) => {
      const next = [newSess, ...prev];
      window.sensix?.saveSessions?.(next);
      return next;
    });
    setCurrentSessionId(newSess.id);
    setActiveTab('chat');
    addToast({ type: 'info', title: 'Nova Sessão', message: 'Sessão vazia criada com sucesso.' });
  };

  const handleDeleteSession = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (!confirmDeleteId) return;
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== confirmDeleteId);
      const fallback = filtered.length > 0 ? filtered[0].id : null;
      if (fallback) setCurrentSessionId(fallback);
      window.sensix?.saveSessions?.(filtered);
      return filtered;
    });
    setConfirmDeleteId(null);
    addToast({ type: 'success', title: 'Sessão Excluída', message: 'Sessão removida do histórico local.' });
  };

  return (
    <div className="app-shell">
      <WindowBar />
      <div className="app-layout">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={(id) => {
            setCurrentSessionId(id);
            setActiveTab('chat');
          }}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onToggleArchive={(id) => {
            const sess = sessions.find((s) => s.id === id);
            if (sess) handleUpdateSession({ ...sess, archived: !sess.archived });
          }}
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          onNewProject={() => setProjectModalOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTelemetry={() => setActiveTab('telemetry')}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        <main className="main-viewport">
          {activeTab === 'chat' && (
            <ChatPage
              session={currentSession}
              models={models}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              runMode={runMode}
              onChangeRunMode={setRunMode}
              actionMode={actionMode}
              onChangeActionMode={setActionMode}
              onUpdateSession={handleUpdateSession}
            />
          )}

          {activeTab === 'files' && <FileExplorerPage session={currentSession} />}

          {activeTab === 'learning' && <AutoLearningLedgerPage />}

          {activeTab === 'security' && <SecurityAuditPage />}

          {activeTab === 'routing' && (
            <InferenceRoutingPage models={models} selectedModel={selectedModel} />
          )}

          {activeTab === 'terminal' && <TerminalPage />}

          {activeTab === 'telemetry' && <TelemetryPage />}

          {activeTab === 'workspace' && <WorkspacePage session={currentSession} />}
        </main>
      </div>

      <ToastContainer />

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setPaletteOpen(false);
        }}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setPaletteOpen(false);
        }}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <PromptTemplatesModal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSelectTemplate={(prompt) => {
          // Send to chat
          setActiveTab('chat');
        }}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialSettings={settingsData}
        onSave={async (newSettings) => {
          const res = await window.sensix?.saveSettings?.(newSettings);
          setSettingsData(res);
        }}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onCreateProject={(proj) => setProjects((prev) => [...prev, proj])}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir Sessão"
        message="Tem certeza de que deseja excluir permanentemente esta sessão e todo o seu histórico?"
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
