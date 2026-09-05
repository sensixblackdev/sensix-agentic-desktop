import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

function getFileIcon(filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  if (['js', 'jsx', 'ts', 'tsx', 'cjs', 'mjs'].includes(ext)) return <FileCode size={13} className="text-accent" />;
  if (['json', 'yaml', 'yml'].includes(ext)) return <FileJson size={13} className="text-warning" />;
  if (['md', 'txt', 'log'].includes(ext)) return <FileText size={13} className="text-muted" />;
  return <File size={13} className="text-dim" />;
}

export function FileTree({ items = [], onSelectFile, selectedPath = '' }) {
  const [expandedFolders, setExpandedFolders] = useState({ 'root': true });

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  return (
    <div className="file-tree-container" role="tree">
      {items.filter(Boolean).map((item, idx) => {
        const name = item.name || `item_${idx}`;
        const isDir = item.type === 'directory';
        const isExpanded = Boolean(expandedFolders[name]);
        const isSelected = selectedPath === name;

        return (
          <div key={item.relativePath || name} className="tree-node">
            <button
              type="button"
              className={`tree-item-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (isDir) toggleFolder(name);
                else if (onSelectFile) onSelectFile(item);
              }}
              role="treeitem"
            >
              {isDir ? (
                <>
                  <span className="folder-arrow">
                    {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  </span>
                  {isExpanded ? <FolderOpen size={14} className="text-accent" /> : <Folder size={14} className="text-accent" />}
                </>
              ) : (
                <>
                  <span className="file-spacer"></span>
                  {getFileIcon(name)}
                </>
              )}
              <span className="tree-item-name">{name}</span>
              {item.size !== undefined && (
                <span className="tree-item-size">{Math.round(item.size / 1024) || 1} KB</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
