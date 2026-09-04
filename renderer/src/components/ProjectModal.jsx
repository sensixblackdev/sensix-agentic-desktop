import React, { useState } from 'react';
import { Modal } from './Modal';
import { Folder, FolderPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function ProjectModal({ isOpen, onClose, onCreateProject }) {
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const { addToast } = useToast();

  const handleChooseFolder = async () => {
    try {
      const chosen = await window.sensix?.chooseFolder?.();
      if (chosen) setFolder(chosen);
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao escolher pasta', message: err.message });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !folder) {
      addToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Informe o nome e a pasta de trabalho.' });
      return;
    }
    onCreateProject({ name, folder });
    addToast({ type: 'success', title: 'Projeto Criado', message: `Projeto '${name}' associado com sucesso.` });
    setName('');
    setFolder('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Projeto" eyebrow="ORGANIZAÇÃO LOCAL">
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name-input">Nome do Projeto</label>
          <input
            id="project-name-input"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: SENSIX Microservices"
            required
            maxLength={80}
          />
        </div>

        <div className="form-group">
          <label htmlFor="project-folder-input">Pasta Raiz de Trabalho</label>
          <div className="input-with-button">
            <input
              id="project-folder-input"
              type="text"
              className="form-input"
              value={folder}
              readOnly
              placeholder="Escolha uma pasta no computador"
              required
            />
            <button type="button" className="btn-secondary" onClick={handleChooseFolder}>
              <Folder size={14} />
              <span>Escolher</span>
            </button>
          </div>
        </div>

        <div className="modal-actions-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            <FolderPlus size={14} />
            <span>Criar Projeto</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
