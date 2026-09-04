import React from 'react';
import { Modal } from './Modal';
import { Keyboard } from 'lucide-react';

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  const shortcuts = [
    { key: 'Ctrl + K', desc: 'Abrir a Command Palette / Busca Global' },
    { key: 'Ctrl + N', desc: 'Criar uma nova sessão de chat' },
    { key: 'Esc', desc: 'Interromper execução do agente / Fechar modais' },
    { key: 'Enter', desc: 'Enviar mensagem no composer' },
    { key: 'Shift + Enter', desc: 'Quebra de linha no composer' },
    { key: '/help', desc: 'Exibir central de comandos no chat' },
    { key: '/status', desc: 'Ver diagnóstico em tempo real da sessão' },
    { key: '/clear', desc: 'Limpar histórico e tarefas da sessão' },
    { key: '/compact', desc: 'Compactar mensagens para economizar tokens' },
    { key: '/rules', desc: 'Inspecionar diretrizes do workspace e RAG' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atalhos de Teclado" eyebrow="PRODUTIVIDADE">
      <div className="shortcuts-table">
        {shortcuts.map((sc, i) => (
          <div key={i} className="shortcut-row">
            <span className="shortcut-desc">{sc.desc}</span>
            <kbd className="shortcut-key">{sc.key}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
