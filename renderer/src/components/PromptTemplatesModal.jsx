import React from 'react';
import { Modal } from './Modal';
import { Sparkles, Code, Bug, Shield, Wrench, ArrowUpRight } from 'lucide-react';

export function PromptTemplatesModal({ isOpen, onClose, onSelectTemplate }) {
  const templates = [
    {
      title: 'Criar Nova Feature de Ponta a Ponta',
      icon: Sparkles,
      tag: 'Criação',
      prompt: 'Crie um módulo completo para [nome da feature]. Crie os arquivos de implementação com regras de negócio reais, os arquivos de teste unitário e rode os testes no terminal com shell_exec para validar o sucesso.'
    },
    {
      title: 'Refatoração Cirúrgica & Clean Code',
      icon: Code,
      tag: 'Refatoração',
      prompt: 'Analise o arquivo [caminho do arquivo] e execute uma refatoração cirúrgica com patch_file para eliminar código duplicado, melhorar a tipagem e manter retrocompatibilidade estrita.'
    },
    {
      title: 'Diagnóstico de Bug com Auto-Healing',
      icon: Bug,
      tag: 'Depuração',
      prompt: 'Investigue o erro [descreva o erro]. Use search_text e read_file para encontrar a causa raiz no código, aplique a correção cirúrgica e comprove com uma execução no terminal.'
    },
    {
      title: 'Auditoria de Segurança & Guardrails',
      icon: Shield,
      tag: 'Segurança',
      prompt: 'Audite a segurança da aplicação: verifique se há credenciais expostas, faça sanitize em entradas de usuário e garanta conformidade com as diretrizes do AGENTS.md.'
    },
    {
      title: 'Suíte de Testes Unitários Automatizados',
      icon: Wrench,
      tag: 'Qualidade',
      prompt: 'Escreva uma suíte completa de testes unitários automatizados para o componente [nome do componente], cobrindo casos de sucesso, borda e falha.'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Galeria de Templates de Engenharia" eyebrow="PROMPT ENGINEERING" maxWidth="640px">
      <div className="templates-grid">
        {templates.map((tpl, i) => {
          const Icon = tpl.icon;
          return (
            <button
              key={i}
              type="button"
              className="template-card-btn"
              onClick={() => {
                onSelectTemplate(tpl.prompt);
                onClose();
              }}
            >
              <div className="template-card-header">
                <Icon size={16} className="text-accent" />
                <span className="template-tag">{tpl.tag}</span>
                <ArrowUpRight size={13} className="template-arrow" />
              </div>
              <strong className="template-card-title">{tpl.title}</strong>
              <p className="template-card-desc">{tpl.prompt}</p>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
