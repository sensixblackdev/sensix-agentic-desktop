import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || "Confirmar Ação"} eyebrow="ATENÇÃO">
      <div className="confirm-modal-content">
        <div className="confirm-icon-box">
          <AlertTriangle size={24} className="text-danger" />
        </div>
        <p className="confirm-message">{message || "Tem certeza de que deseja prosseguir com esta operação?"}</p>
      </div>

      <div className="modal-actions-footer">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          <Trash2 size={14} />
          <span>Confirmar Exclusão</span>
        </button>
      </div>
    </Modal>
  );
}
