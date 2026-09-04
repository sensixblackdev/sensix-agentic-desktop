import React, { useState, useEffect } from 'react';
import { FolderTree, Search, RefreshCw, FileCode, ExternalLink, HardDrive } from 'lucide-react';
import { FileTree } from '../components/FileTree';
import { CodeViewer } from '../components/CodeViewer';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useToast } from '../context/ToastContext';

export function FileExplorerPage({ session }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const folder = session?.projectFolder || '.';
      const data = await window.sensix?.inspectFolder?.(folder);
      if (data && data.ok && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao listar arquivos', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [session]);

  const handleSelectFile = async (item) => {
    setSelectedFile(item);
    setFileContent('Carregando conteúdo...');
    try {
      const res = await window.sensix?.previewFile?.(item.name);
      if (res && res.ok) {
        setFileContent(res.content || '(Arquivo vazio)');
      } else {
        setFileContent(`// Não foi possível carregar a prévia: ${res?.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      setFileContent(`// Erro de leitura: ${err.message}`);
    }
  };

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="file-explorer-page fade-in">
      <header className="page-header-bar">
        <div className="page-title-group">
          <FolderTree size={18} className="text-accent" />
          <h2>Explorador de Arquivos & Código</h2>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={loadDirectory} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <div className="explorer-layout-grid">
        <aside className="explorer-tree-sidebar">
          <div className="explorer-search-box">
            <Search size={13} className="text-dim" />
            <input
              type="text"
              className="explorer-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar arquivos..."
            />
          </div>

          <div className="tree-scroll-panel">
            <FileTree
              items={filteredItems}
              onSelectFile={handleSelectFile}
              selectedPath={selectedFile?.name}
            />
          </div>
        </aside>

        <section className="explorer-code-panel">
          {selectedFile ? (
            <div className="code-panel-inner">
              <Breadcrumbs items={['Workspace', selectedFile.name]} />
              <CodeViewer
                code={fileContent}
                filePath={selectedFile.name}
                language={selectedFile.name.split('.').pop()}
              />
            </div>
          ) : (
            <div className="empty-selection-notice">
              <FileCode size={36} className="text-dim mb-3" />
              <p>Selecione um arquivo na árvore à esquerda para visualizar seu código fonte.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
