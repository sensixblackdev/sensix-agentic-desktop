import React, { useState } from 'react';
import { Modal } from './Modal';
import { KeyRound, Globe, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function SettingsModal({ isOpen, onClose, initialSettings = {}, onSave }) {
  const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl || 'https://api.sensix.it.com/v1');
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({ baseUrl, token });
      addToast({ type: 'success', title: 'Configurações salvas', message: 'Credenciais atualizadas com sucesso.' });
      onClose();
    } catch (err) {
      addToast({ type: 'error', title: 'Falha ao salvar', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações do Gateway" eyebrow="ACESSO & CREDENCIAIS">
      <form className="settings-form" onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="settings-base-url">
            <Globe size={14} className="text-accent" />
            <span>Endpoint Base (OpenAI / OpenRouter Compatible)</span>
          </label>
          <input
            id="settings-base-url"
            type="url"
            className="form-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required
            placeholder="https://api.sensix.it.com/v1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="settings-api-key">
            <KeyRound size={14} className="text-accent" />
            <span>Chave de API / Token</span>
          </label>
          <input
            id="settings-api-key"
            type="password"
            className="form-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="••••••••••••••••••••••••••••"
          />
          <small className="form-hint">A chave é armazenada de forma segura na DPAPI local do Windows.</small>
        </div>

        <div className="modal-actions-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            <Save size={14} />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
