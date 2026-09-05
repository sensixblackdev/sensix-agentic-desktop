import React, { useState, useEffect } from 'react';
import {
  Code2,
  FolderTree,
  Search,
  RefreshCw,
  Plus,
  FilePlus,
  FolderPlus,
  X,
  Sparkles,
  FileCode,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FileTree } from '../components/FileTree';
import { CodeEditor } from '../components/CodeEditor';
import { AIInlineAssistant } from '../components/AIInlineAssistant';
import { DiffReviewModal } from '../components/DiffReviewModal';
import { useToast } from '../context/ToastContext';

export function IDEPage({ session, models = [], selectedModel = '', onSelectModel }) {
  const [items, setItems] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tabs management
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabPath, setActiveTabPath] = useState(null);
  
  // AI Assistant state
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [diffReviewData, setDiffReviewData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { addToast } = useToast();

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  // Load directory items
  const loadDirectory = async () => {
    setLoadingTree(true);
    try {
      const folder = session?.projectFolder || '.';
      const data = await window.sensix?.inspectFolder?.(folder);
      if (data && data.ok && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao listar workspace', message: err.message });
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [session]);

  // Open file in tabs
  const handleOpenFile = async (item) => {
    const filePath = item?.relativePath || item?.name;
    if (!filePath) return;

    // Check if already open
    const existing = openTabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabPath(filePath);
      return;
    }

    try {
      const res = await window.sensix?.readFilePreview?.(filePath);
      if (res && res.ok) {
        const content = res.content || '';
        const newTab = {
          path: filePath,
          name: res.name || filePath.split(/[\\/]/).pop(),
          content: content,
          originalContent: content,
          isDirty: false,
          language: filePath.split('.').pop() || 'plaintext'
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabPath(filePath);
      } else {
        addToast({ type: 'error', title: 'Falha ao abrir arquivo', message: res?.error || 'Arquivo ilegível' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro de leitura', message: err.message });
    }
  };

  // Close tab
  const handleCloseTab = (path, e) => {
    e?.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      if (activeTabPath === path) {
        setActiveTabPath(next.length > 0 ? next[next.length - 1].path : null);
      }
      return next;
    });
  };

  // Content change
  const handleContentChange = (newContent) => {
    if (!activeTab) return;
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.path === activeTab.path
          ? { ...t, content: newContent, isDirty: newContent !== t.originalContent }
          : t
      )
    );
  };

  // Save active file
  const handleSaveFile = async () => {
    if (!activeTab || isSaving) return;
    setIsSaving(true);
    try {
      const res = await window.sensix?.saveFile?.(activeTab.path, activeTab.content);
      if (res && res.ok) {
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.path === activeTab.path
              ? { ...t, originalContent: t.content, isDirty: false }
              : t
          )
        );
        addToast({ type: 'success', title: 'Arquivo Salvo', message: `${activeTab.name} gravado no disco com sucesso.` });
      } else {
        addToast({ type: 'error', title: 'Erro ao salvar', message: res?.error || 'Falha de gravação' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Exceção de gravação', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit AI edit
  const handleAiSubmit = async (instruction) => {
    if (!activeTab || isAiGenerating) return;
    setIsAiGenerating(true);

    try {
      const targetModel = selectedModel || 'cognitivecomputations/dolphin-mistral-24b-venice-edition';
      const res = await window.sensix?.aiEditCode?.({
        filePath: activeTab.path,
        currentCode: activeTab.content,
        instruction,
        model: targetModel
      });

      if (res && res.ok) {
        setAiAssistantOpen(false);
        setDiffReviewData({
          originalCode: res.originalCode,
          modifiedCode: res.modifiedCode,
          instruction,
          modelUsed: res.modelUsed,
          fileName: activeTab.name
        });
      } else {
        addToast({ type: 'error', title: 'Falha na geração de código', message: res?.error || 'A IA não retornou alterações válidas.' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro de inferência', message: err.message });
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Accept AI diff
  const handleAcceptDiff = () => {
    if (!diffReviewData || !activeTab) return;
    handleContentChange(diffReviewData.modifiedCode);
    setDiffReviewData(null);
    addToast({ type: 'success', title: 'Alterações Aplicadas', message: 'Código da IA inserido no editor. Pressione Ctrl+S para salvar no disco.' });
  };

  // Create new file
  const handleCreateNewFile = async () => {
    const filename = window.prompt ? null : 'novo_arquivo_' + Date.now() + '.js';
    const chosenName = filename || `novo_arquivo_${Date.now()}.js`;
    const newTab = {
      path: chosenName,
      name: chosenName,
      content: '// Novo arquivo criado no SENSIX IDE\n\n',
      originalContent: '',
      isDirty: true,
      language: 'javascript'
    };
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabPath(newTab.path);
  };

  const filteredItems = items.filter((i) =>
    i?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ide-page-root fade-in">
      {/* Sidebar de Arquivos da IDE */}
      <aside className="ide-files-sidebar">
        <header className="ide-sidebar-header">
          <div className="ide-title-badge">
            <Code2 size={16} className="text-accent" />
            <h2>SENSIX IDE</h2>
          </div>
          <div className="ide-header-btn-row">
            <button
              type="button"
              className="btn-icon-tiny"
              onClick={handleCreateNewFile}
              title="Criar novo arquivo"
            >
              <FilePlus size={13} />
            </button>
            <button
              type="button"
              className="btn-icon-tiny"
              onClick={loadDirectory}
              disabled={loadingTree}
              title="Atualizar diretório"
            >
              <RefreshCw size={13} className={loadingTree ? 'spin' : ''} />
            </button>
          </div>
        </header>

        <div className="ide-search-box">
          <Search size={12} className="text-dim" />
          <input
            type="text"
            className="ide-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar arquivos..."
          />
        </div>

        <div className="ide-tree-scroll">
          <FileTree
            items={filteredItems}
            onSelectFile={handleOpenFile}
            selectedPath={activeTabPath}
          />
        </div>
      </aside>

      {/* Viewport Central do Editor */}
      <section className="ide-editor-viewport">
        {/* Barra de Abas Abertas */}
        <div className="ide-tabs-bar" role="tablist">
          {openTabs.map((tab) => {
            const isActive = tab.path === activeTabPath;
            return (
              <div
                key={tab.path}
                className={`ide-tab-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTabPath(tab.path)}
                role="tab"
                aria-selected={isActive}
              >
                <FileCode size={13} className={isActive ? 'text-accent' : 'text-dim'} />
                <span className="ide-tab-name">{tab.name}</span>
                {tab.isDirty && <span className="tab-dirty-dot" title="Alterações não salvas">●</span>}
                <button
                  type="button"
                  className="ide-tab-close"
                  onClick={(e) => handleCloseTab(tab.path, e)}
                  title="Fechar aba"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}

          {openTabs.length === 0 && (
            <div className="ide-tabs-empty-hint">
              <span>Selecione um arquivo na árvore à esquerda para abrir no editor</span>
            </div>
          )}
        </div>

        {/* Área do Editor */}
        <div className="ide-editor-container">
          {activeTab ? (
            <>
              <AIInlineAssistant
                isOpen={aiAssistantOpen}
                onClose={() => setAiAssistantOpen(false)}
                onSubmit={handleAiSubmit}
                isGenerating={isAiGenerating}
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                models={models}
                filePath={activeTab.path}
              />

              <CodeEditor
                value={activeTab.content}
                onChange={handleContentChange}
                onSave={handleSaveFile}
                onOpenAI={() => setAiAssistantOpen((prev) => !prev)}
                filePath={activeTab.path}
                isDirty={activeTab.isDirty}
                isSaving={isSaving}
                language={activeTab.language}
              />
            </>
          ) : (
            <div className="ide-empty-workspace fade-in">
              <div className="ide-brand-watermark">
                <Code2 size={40} className="text-dim" />
              </div>
              <h3>SENSIX Real-Time IDE & Code Engine</h3>
              <p>Edição interativa de código em tempo real com assistência agêntica de alta performance.</p>
              <div className="ide-shortcuts-guide">
                <div className="shortcut-pill"><kbd>Ctrl+S</kbd><span>Salvar arquivo</span></div>
                <div className="shortcut-pill"><kbd>Ctrl+I</kbd><span>Assistente IA Inline</span></div>
                <div className="shortcut-pill"><kbd>Tab</kbd><span>Indentar 2 espaços</span></div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal de Revisão de Diff */}
      {diffReviewData && (
        <DiffReviewModal
          isOpen={Boolean(diffReviewData)}
          originalCode={diffReviewData.originalCode}
          modifiedCode={diffReviewData.modifiedCode}
          instruction={diffReviewData.instruction}
          modelUsed={diffReviewData.modelUsed}
          fileName={diffReviewData.fileName}
          onAccept={handleAcceptDiff}
          onReject={() => setDiffReviewData(null)}
        />
      )}
    </div>
  );
}
