import React, { useState, useEffect } from 'react';
import { ChatHeader } from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';
import { TodoList } from '../components/TodoList';
import { Composer } from '../components/Composer';
import { useToast } from '../context/ToastContext';

export function ChatPage({
  session,
  models,
  selectedModel,
  onSelectModel,
  runMode,
  onChangeRunMode,
  actionMode,
  onChangeActionMode,
  onUpdateSession
}) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [runStatus, setRunStatus] = useState('');
  const [activeRunId, setActiveRunId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    const handleChatEvent = (event) => {
      if (!event || !session) return;

      if (event.type === 'tool_start') {
        const updatedMessages = [...(session.messages || [])];
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          if (!Array.isArray(lastMsg.steps)) lastMsg.steps = [];
          lastMsg.steps.push({
            id: event.toolId,
            tool: event.tool,
            description: event.description,
            status: 'running'
          });
          onUpdateSession({ ...session, messages: updatedMessages });
        }
        setRunStatus(event.description || `Executando ${event.tool}...`);
      }

      if (event.type === 'tool_done') {
        const updatedMessages = [...(session.messages || [])];
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && Array.isArray(lastMsg.steps)) {
          const step = lastMsg.steps.find((s) => s.id === event.toolId);
          if (step) {
            step.status = event.ok ? 'done' : 'error';
            step.summary = event.summary;
            step.diff = event.diff || null;
          }
          onUpdateSession({ ...session, messages: updatedMessages });
        }
        setRunStatus(event.ok ? `${event.tool} concluída` : `${event.tool} falhou`);
      }

      if (event.type === 'todo_update') {
        onUpdateSession({ ...session, todos: event.todos });
      }

      if (event.type === 'token') {
        const updatedMessages = [...(session.messages || [])];
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = (lastMsg.content || '') + (event.content || '');
          onUpdateSession({ ...session, messages: updatedMessages });
        }
      }

      if (event.type === 'done' || event.type === 'cancelled' || event.type === 'error') {
        setIsSending(false);
        setActiveRunId(null);
        setRunStatus('');
        if (event.type === 'done') {
          addToast({ type: 'success', title: 'Tarefa Concluída', message: 'O agente finalizou o plano com sucesso.' });
        } else if (event.type === 'cancelled') {
          addToast({ type: 'info', title: 'Cancelado', message: 'Execução interrompida pelo usuário.' });
        } else if (event.type === 'error') {
          const updatedMessages = [...(session.messages || [])];
          const lastMsg = updatedMessages[updatedMessages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
            lastMsg.content = `Falha na execução: ${event.message || 'Erro de resposta do modelo.'}`;
            lastMsg.isError = true;
            onUpdateSession({ ...session, messages: updatedMessages });
          }
          addToast({ type: 'error', title: 'Erro de Execução', message: event.message || 'Falha na resposta do agente.' });
        }
      }
    };

    const unsubscribe = window.sensix?.onChatEvent?.(handleChatEvent);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [session, onUpdateSession, addToast]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    if (trimmed.startsWith('/')) {
      handleSlashCommand(trimmed);
      return;
    }

    const runId = 'run_' + Date.now();
    setActiveRunId(runId);
    setIsSending(true);

    const userMessage = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content: trimmed,
      attachments: [...attachments]
    };

    const assistantMessage = {
      id: 'msg_asst_' + Date.now(),
      role: 'assistant',
      content: '',
      steps: []
    };

    const nextMessages = [...(session.messages || []), userMessage, assistantMessage];
    onUpdateSession({ ...session, messages: nextMessages });
    setInput('');
    setAttachments([]);
    setRunStatus('Iniciando raciocínio agêntico...');

    try {
      await window.sensix?.sendChat?.({
        runId,
        sessionId: session.id,
        messages: nextMessages.slice(0, -1),
        model: selectedModel,
        runMode,
        actionMode,
        attachments: userMessage.attachments
      });
    } catch (err) {
      setIsSending(false);
      setActiveRunId(null);
      setRunStatus('');
      addToast({ type: 'error', title: 'Falha ao iniciar envio', message: err.message });
    }
  };

  const handleSlashCommand = async (cmdStr) => {
    const parts = cmdStr.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    setInput('');

    if (cmd === '/clear') {
      onUpdateSession({ ...session, messages: [], todos: [] });
      addToast({ type: 'info', title: 'Chat Limpo', message: 'Mensagens e checklist da sessão foram redefinidos.' });
      return;
    }

    if (cmd === '/help') {
      const helpMsg = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: `🤖 **Comandos do SENSIX Agentic Console:**\n\n` +
          `• \`/help\` — Exibe esta central de comandos.\n` +
          `• \`/status\` — Diagnóstico da sessão ativa, tokens e RAG.\n` +
          `• \`/clear\` — Limpa mensagens e checklist.\n` +
          `• \`/compact\` — Compacta o histórico para economizar contexto.\n` +
          `• \`/rules\` — Inspeciona diretrizes ativas e cache RAG.\n` +
          `• \`/learning\` — Exibe o ledger de auto-aprendizado.\n` +
          `• \`/init\` — Cria o arquivo canônico de diretrizes (\`AGENTS.md\`).`
      };
      onUpdateSession({ ...session, messages: [...(session.messages || []), helpMsg] });
      return;
    }

    if (cmd === '/status') {
      const ragStats = await window.sensix?.getDirectivesStats?.();
      const learningStats = await window.sensix?.getLearningStats?.();
      const todos = session.todos || [];
      const completed = todos.filter((t) => t.status === 'completed').length;
      const statusMsg = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: `📊 **Status Operacional da Sessão:**\n\n` +
          `• **Modelo Ativo:** \`${selectedModel || 'Padrão'}\`\n` +
          `• **Projeto / Workspace:** \`${session.project || 'Geral'}\`\n` +
          `• **Mensagens no Histórico:** ${session.messages?.length || 0}\n` +
          `• **Checklist de Tarefas:** ${completed}/${todos.length} concluídas\n` +
          `• **Diretrizes RAG:** ${ragStats?.cacheHits || 0} hits de cache em memória\n` +
          `• **Auto-Learning Ledger:** ${learningStats?.totalLessons || 0} lições ativas`
      };
      onUpdateSession({ ...session, messages: [...(session.messages || []), statusMsg] });
      return;
    }
  };

  const handleCancel = async () => {
    if (activeRunId) {
      await window.sensix?.cancelChat?.(activeRunId);
      setIsSending(false);
      setActiveRunId(null);
      setRunStatus('');
      addToast({ type: 'info', title: 'Interrompido', message: 'Execução cancelada via Esc/Parar.' });
    }
  };

  const handleAttachFiles = async () => {
    try {
      const filePaths = await window.sensix?.chooseFiles?.();
      if (Array.isArray(filePaths) && filePaths.length > 0) {
        const newAtts = filePaths.map((p) => ({ path: p, name: p.split(/[\\/]/).pop() }));
        setAttachments((prev) => [...prev, ...newAtts]);
        addToast({ type: 'info', title: 'Arquivos Anexados', message: `${filePaths.length} arquivo(s) prontos para análise.` });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao anexar', message: err.message });
    }
  };

  return (
    <div className="chat-page-layout">
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        runMode={runMode}
        onChangeRunMode={onChangeRunMode}
        actionMode={actionMode}
        onChangeActionMode={onChangeActionMode}
      />

      <div className="chat-content-scroll">
        <TodoList todos={session?.todos || []} />
        <MessageList messages={session?.messages || []} isThinking={isSending} />
      </div>

      <Composer
        input={input}
        setInput={setInput}
        isSending={isSending}
        onSend={handleSend}
        onCancel={handleCancel}
        attachments={attachments}
        onAttachFiles={handleAttachFiles}
        onRemoveAttachment={(idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
        runStatus={runStatus}
      />
    </div>
  );
}
