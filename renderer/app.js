(function () {
  'use strict';

  const SESSION_KEY = 'sensix-agentic-sessions-v1';
  const SYSTEM_PROMPT = 'Você é o agente autônomo de software SENSIX (AXION). Execute ferramentas de ponta a ponta sem procrastinar em texto. Se precisar inspecionar, listar, criar ou editar arquivos, invoque as ferramentas na mesma resposta.';
  const els = {
    sessionList: document.getElementById('session-list'),
    modelSelect: document.getElementById('model-select'),
    emptyState: document.getElementById('empty-state'),
    messageList: document.getElementById('message-list'),
    chatScroll: document.getElementById('chat-scroll'),
    composerForm: document.getElementById('composer-form'),
    composerInput: document.getElementById('composer-input'),
    attachmentsBar: document.getElementById('attachments-bar'),
    sendButton: document.getElementById('send-button'),
    runStatus: document.getElementById('run-status'),
    statusDot: document.getElementById('status-dot'),
    connectionLabel: document.getElementById('connection-label'),
    connectionDetail: document.getElementById('connection-detail'),
    settingsModal: document.getElementById('settings-modal'),
    settingsForm: document.getElementById('settings-form'),
    baseUrlInput: document.getElementById('base-url-input'),
    apiKeyInput: document.getElementById('api-key-input'),
    settingsState: document.getElementById('settings-state'),
    saveSettingsButton: document.getElementById('save-settings-button'),
    permissionSummary: document.getElementById('permission-summary'),
    ephemeralToggle: document.getElementById('ephemeral-toggle'),
    scrollToBottom: document.getElementById('scroll-to-bottom'),
    projectFilter: document.getElementById('project-filter'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmCopy: document.getElementById('confirm-copy'),
    steerPanel: document.getElementById('steer-panel'),
    steerInput: document.getElementById('steer-input'),
    actionModeInput: document.getElementById('action-mode-input'),
    themeInput: document.getElementById('theme-input'),
    projectModal: document.getElementById('project-modal'), projectForm: document.getElementById('project-form'), projectName: document.getElementById('project-name-input'), projectFolder: document.getElementById('project-folder-input'), projectState: document.getElementById('project-state'),
    runModeSelect: document.getElementById('run-mode-select'),
    actionModeSelect: document.getElementById('action-mode-select'),
    runModeButton: document.getElementById('run-mode-button'), runModeLabel: document.getElementById('run-mode-label'),
    actionModeButton: document.getElementById('action-mode-button'), actionModeLabel: document.getElementById('action-mode-label'),
    todoContainer: document.getElementById('todo-container'),
    todoBadge: document.getElementById('todo-badge'),
    todoList: document.getElementById('todo-list'),
    todoProgressFill: document.getElementById('todo-progress-fill'),
  };
  const icons = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8l1.2 1.9 2.2.4 1.8-1 1.7 1.7-1 1.8.4 2.2 1.9 1.2v2.4l-1.9 1.2-.4 2.2 1 1.8-1.7 1.7-1.8-1-2.2.4L12 20.2l-1.2-1.9-2.2-.4-1.8 1-1.7-1.7 1-1.8-.4-2.2-1.9-1.2v-2.4l1.9-1.2.4-2.2-1-1.8 1.7-1.7 1.8 1 2.2-.4L12 3.8z"/><circle cx="12" cy="12" r="3"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.8-3L4 10"/><path d="M4 5v5h5"/><path d="M4 13a8 8 0 0 0 14.8 3L20 14"/><path d="M20 19v-5h-5"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    terminal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M7 9l3 3-3 3M12 15h5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM9 11h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 14h8l1-14"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-2.9 8.1-7 10-4.1-1.9-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/></svg>',
    paperclip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.88-7.88"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  };

  let settings = { baseUrl: '', configured: false, encryptionAvailable: false };
  let models = [];
  let sessions = loadSessions();
  let currentSession = null;
  let activeRunId = null;
  let isSending = false;
  let removeChatListener = null;
  let showArchived = false;
  let pendingDeleteId = null;
  let attachments = [];
  let steerInstruction = '';
  let projects = JSON.parse(localStorage.getItem('sensix-projects-v1') || '[]');
  let runMode = 'normal';

  function iconMarkup(name) { return icons[name] || ''; }
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function createSession() {
    return { id: crypto.randomUUID(), title: 'Nova sessão', project: 'Geral', createdAt: Date.now(), updatedAt: Date.now(), messages: [], ephemeral: false, archived: false };
  }
  function loadSessions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((session) => Array.isArray(session.messages) && session.messages.some((message) => String(message?.content || '').trim())).slice(0, 30).map((session) => ({
          ...session,
          ephemeral: Boolean(session.ephemeral),
          archived: Boolean(session.archived),
          project: String(session.project || 'Geral'),
          messages: Array.isArray(session.messages) ? session.messages.map((message) => {
            const interrupted = message?.role === 'assistant' && !String(message.content || '').trim();
            return interrupted ? { ...message, content: 'Execução interrompida pelo reinício do app. Envie uma nova solicitação para continuar.' } : message;
          }) : [],
        }));
      }
    } catch {}
    return [createSession()];
  }
  function persistSessions() {
    const durable = sessions.filter((session) => !session.ephemeral && session.messages.some((message) => String(message?.content || '').trim())).slice(0, 30);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(durable)); } catch {}
    if (window.sensix?.saveSessions) window.sensix.saveSessions(durable).catch(() => {});
  }
  function currentOrNewSession() {
    if (!currentSession) currentSession = sessions[0] || createSession();
    if (!sessions.some((session) => session.id === currentSession.id)) sessions.unshift(currentSession);
    return currentSession;
  }
  function formatTime(timestamp) {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
  }
  function renderIcons() {
    document.querySelectorAll('[data-icon]').forEach((node) => { node.innerHTML = iconMarkup(node.dataset.icon); });
  }
  function renderSessions() {
    const project = els.projectFilter?.value || 'all';
    const visible = sessions.filter((session) => (showArchived || !session.archived) && (project === 'all' || session.project === project));
    els.sessionList.innerHTML = visible.map((session) => `<div class="session-row"><button class="session-item ${currentSession?.id === session.id ? 'active' : ''}" type="button" data-action="open-session" data-session-id="${escapeHtml(session.id)}" role="listitem"><span class="svg-icon" data-icon="spark" aria-hidden="true"></span><span class="session-item-title">${escapeHtml(session.title || 'Nova sessão')}</span><span class="session-item-project">${escapeHtml(session.project || 'Geral')}</span>${session.ephemeral ? '<span class="session-item-mode">efêmera</span>' : ''}<span class="session-item-time">${formatTime(session.updatedAt || session.createdAt)}</span></button><button class="session-action" type="button" data-action="toggle-archive" data-session-id="${escapeHtml(session.id)}" aria-label="${session.archived ? 'Restaurar' : 'Arquivar'} sessão" title="${session.archived ? 'Restaurar' : 'Arquivar'}"><span class="svg-icon" data-icon="archive" aria-hidden="true"></span></button><button class="session-action danger" type="button" data-action="request-delete" data-session-id="${escapeHtml(session.id)}" aria-label="Excluir sessão" title="Excluir"><span class="svg-icon" data-icon="trash" aria-hidden="true"></span></button></div>`).join('');
    const projectNames = [...new Set(['Geral', ...projects.map((item) => item.name), ...sessions.map((session) => session.project || 'Geral')])].sort();
    if (els.projectFilter) {
      const selected = els.projectFilter.value || 'all';
      els.projectFilter.innerHTML = '<option value="all">Todos os projetos</option>' + projectNames.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
      els.projectFilter.value = projectNames.includes(selected) ? selected : 'all';
    }
    renderIcons();
  }
  function renderModelOptions() {
    const selected = currentSession?.model || models[0]?.id || '';
    const displayModelName = (model) => {
      const id = model.id;
      if (id === 'qwen2.5-coder:7b' || id === 'qwen3-coder-30b') return '⚡ Qwen 2.5 Coder 7B (Local Offline)';
      if (id === 'cognitivecomputations/dolphin-mistral-24b-venice-edition') return '🔓 Venice Dolphin 24B (Uncensored)';
      if (id === 'nousresearch/hermes-3-llama-3.1-70b') return '🔓 Nous Hermes 3 70B (Uncensored Agentic)';
      if (id === 'nousresearch/hermes-4-70b') return '🔓 Nous Hermes 4 70B (Uncensored Reasoning)';
      if (id === 'qwen/qwen-2.5-coder-32b-instruct') return '💻 Qwen 2.5 Coder 32B (Elite Code)';
      if (id === 'mistralai/codestral-2508') return '💻 Mistral Codestral (256k Code)';
      if (id === 'mistralai/devstral-2512') return '🛠️ Mistral Devstral (Agentic Coder)';
      if (id === 'deepseek/deepseek-chat') return '🧠 DeepSeek V3 685B (SOTA Coding)';
      if (id === 'anthropic/claude-sonnet-5' || id === 'anthropic/claude-3.5-sonnet') return '👑 Claude Sonnet 5 (Premium)';
      if (id === 'openai/gpt-4o') return '👑 GPT-4o (Premium)';
      if (id === 'deepseek/deepseek-r1') return '🧠 DeepSeek R1 (Reasoning)';
      return id;
    };
    els.modelSelect.innerHTML = models.length
      ? models.map((model) => `<option value="${escapeHtml(model.id)}" title="${escapeHtml(model.description)}" ${model.id === selected ? 'selected' : ''}>${escapeHtml(displayModelName(model))}</option>`).join('')
      : '<option value="">Nenhum modelo carregado</option>';
    if (currentSession && selected) currentSession.model = selected;
  }

  function renderTodos(todos) {
    if (!els.todoContainer) return;
    if (!Array.isArray(todos) || todos.length === 0) {
      els.todoContainer.classList.add('hidden');
      return;
    }
    els.todoContainer.classList.remove('hidden');
    const total = todos.length;
    const completed = todos.filter((t) => t.status === 'completed').length;
    const inProgress = todos.filter((t) => t.status === 'in_progress').length;
    const percent = Math.round((completed / total) * 100);
    if (els.todoBadge) els.todoBadge.textContent = `${completed}/${total} (${percent}%)`;
    if (els.todoProgressFill) els.todoProgressFill.style.width = `${percent}%`;

    if (els.todoList) {
      els.todoList.innerHTML = todos.map((t) => {
        const isDone = t.status === 'completed';
        const isRunning = t.status === 'in_progress';
        const statusClass = isDone ? 'completed' : (isRunning ? 'in_progress' : 'pending');
        const icon = isDone ? '✓' : (isRunning ? '' : '');
        return `<div class="todo-item ${statusClass}">
          <span class="todo-status-icon">${icon}</span>
          <span class="todo-task">${escapeHtml(t.task)}</span>
        </div>`;
      }).join('');
    }
  }

  function formatInline(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function renderMarkdown(text) {
    const lines = String(text || '').split(/\r?\n/);
    const output = [];
    let inCode = false;
    let codeLang = '';
    let codeLines = [];
    let listType = null;
    let listItems = [];
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const content = paragraph.join('\n').trim();
      if (content) output.push(`<p>${formatInline(content)}</p>`);
      paragraph = [];
    };

    const flushList = () => {
      if (!listType || !listItems.length) return;
      const tag = listType;
      const inner = listItems.map((item) => `<li>${formatInline(item)}</li>`).join('');
      output.push(`<${tag}>${inner}</${tag}>`);
      listType = null;
      listItems = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        flushParagraph();
        flushList();
        if (inCode) {
          const rawCode = codeLines.join('\n');
          const langLabel = escapeHtml(codeLang || 'código');
          output.push(
            `<div class="code-block">` +
              `<div class="code-header">` +
                `<span class="code-lang">${langLabel}</span>` +
                `<button class="code-copy-btn" type="button" data-action="copy-code">Copiar</button>` +
              `</div>` +
              `<pre><code>${escapeHtml(rawCode)}</code></pre>` +
            `</div>`
          );
          codeLines = [];
          codeLang = '';
        } else {
          codeLang = trimmed.slice(3).trim();
        }
        inCode = !inCode;
        return;
      }

      if (inCode) {
        codeLines.push(line);
        return;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }

      if (/^#{1,3}\s+/.test(trimmed)) {
        flushParagraph();
        flushList();
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const isDelivery = /entrega|conclu|final/i.test(headingText);
        const extraClass = isDelivery ? ' class="delivery-heading"' : '';
        output.push(`<h${level}${extraClass}>${formatInline(headingText)}</h${level}>`);
        return;
      }

      const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      if (ulMatch) {
        flushParagraph();
        if (listType !== 'ul') flushList();
        listType = 'ul';
        listItems.push(ulMatch[2]);
        return;
      }

      const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
      if (olMatch) {
        flushParagraph();
        if (listType !== 'ol') flushList();
        listType = 'ol';
        listItems.push(olMatch[2]);
        return;
      }

      if (listType) {
        flushList();
      }

      paragraph.push(line);
    });

    if (inCode) {
      const rawCode = codeLines.join('\n');
      const langLabel = escapeHtml(codeLang || 'código');
      output.push(
        `<div class="code-block">` +
          `<div class="code-header">` +
            `<span class="code-lang">${langLabel}</span>` +
            `<button class="code-copy-btn" type="button" data-action="copy-code">Copiar</button>` +
          `</div>` +
          `<pre><code>${escapeHtml(rawCode)}</code></pre>` +
        `</div>`
      );
    }

    flushParagraph();
    flushList();

    return output.join('') || '<p></p>';
  }
  function renderMessages() {
    const session = currentOrNewSession();
    const wasNearBottom = els.chatScroll.scrollHeight - els.chatScroll.scrollTop - els.chatScroll.clientHeight < 120;
    const hasMessages = session.messages.length > 0;
    els.emptyState.classList.toggle('hidden', hasMessages);
    els.messageList.innerHTML = session.messages.map((message, index) => {
      const steps = Array.isArray(message.steps) ? message.steps : [];
      const messageId = message.id || `message-${index}`;
      const collapsed = message.stepsCollapsed === true;
      const stepsMarkup = steps.length
        ? `<div class="tool-timeline ${collapsed ? 'collapsed' : ''}"><button class="tool-timeline-toggle" type="button" data-action="toggle-tool-timeline" data-message-id="${escapeHtml(messageId)}" aria-expanded="${String(!collapsed)}"><span>${collapsed ? 'Mostrar' : 'Ocultar'} etapas · ${steps.length}</span><span class="svg-icon" data-icon="arrowDown" aria-hidden="true"></span></button><div class="tool-timeline-body">${steps.map((step) => `<div class="tool-step ${escapeHtml(step.status || 'running')}"><span class="tool-step-state" aria-hidden="true"></span><div><strong>${escapeHtml(step.tool || 'tool')}</strong><small>${escapeHtml(step.summary || step.description || 'Executando...')}</small></div></div>`).join('')}</div></div>`
        : '';
      const attachmentsMarkup = Array.isArray(message.attachments) && message.attachments.length > 0
        ? `<div class="attachments-bar" style="padding:0 0 8px;">${message.attachments.map((att) => {
            const iconName = att.type === 'folder' ? 'folder' : att.isImage ? 'image' : 'file';
            const badge = att.count ? `${att.count} itens` : att.size ? `${Math.round(att.size / 1024)} KB` : '';
            return `<div class="attachment-chip"><span class="svg-icon" data-icon="${iconName}">${icons[iconName] || icons.file}</span><span class="attachment-name">${escapeHtml(att.name || att.path)}</span>${badge ? `<span class="attachment-badge">${escapeHtml(badge)}</span>` : ''}</div>`;
          }).join('')}</div>`
        : '';
      const needsAnswer = message.role === 'assistant' && /\?\s*$/.test(String(message.content || '').trim());
      const isPlan = message.role === 'assistant' && /(^|\n)#{1,3}\s*(plano|plan|etapas)/i.test(String(message.content || ''));
      const displayBody = message.displayContent || message.content;
      return `<article class="message ${message.role === 'user' ? 'user' : 'assistant'} ${needsAnswer ? 'question-card' : ''} ${isPlan ? 'plan-card' : ''}" data-message-id="${escapeHtml(messageId)}"><div class="message-avatar" aria-hidden="true">${message.role === 'user' ? 'U' : 'S'}</div><div><div class="message-meta">${message.role === 'user' ? 'Você' : needsAnswer ? 'SENSIX Agent · precisa da sua decisão' : isPlan ? 'SENSIX Agent · plano' : 'SENSIX Agent'}</div>${attachmentsMarkup}${stepsMarkup}<div class="message-body">${renderMarkdown(displayBody)}</div></div></article>`;
    }).join('');
    requestAnimationFrame(() => { if (wasNearBottom || isSending) els.chatScroll.scrollTop = els.chatScroll.scrollHeight; updateScrollAffordance(); });
  }
  function setConnection(status, detail) {
    els.statusDot.classList.toggle('online', status === 'online');
    els.statusDot.classList.toggle('error', status === 'error');
    els.connectionLabel.textContent = status === 'online' ? 'Gateway conectado' : status === 'error' ? 'Falha de conexão' : 'Gateway não configurado';
    els.connectionDetail.textContent = detail;
  }
  function setSettingsState(message, type = '') {
    els.settingsState.textContent = message || '';
    els.settingsState.className = `form-state ${type}`.trim();
  }
  function showSettings() {
    els.baseUrlInput.value = settings.baseUrl || 'https://api.sensix.it.com/v1';
    els.apiKeyInput.value = '';
    els.actionModeInput.value = localStorage.getItem('sensix-action-mode') || 'guarded';
    els.actionModeSelect.value = localStorage.getItem('sensix-action-mode') === 'full-access' ? 'full-access' : 'normal';
    syncModeControls();
    els.themeInput.value = localStorage.getItem('sensix-theme') || 'obsidian';
    setSettingsState(settings.encryptionAvailable ? '' : 'O armazenamento criptografado não está disponível neste sistema.', settings.encryptionAvailable ? '' : 'error');
    els.settingsModal.classList.remove('hidden');
    els.apiKeyInput.focus();
  }
  function hideSettings() { els.settingsModal.classList.add('hidden'); }
  function setRunStatus(message) { els.runStatus.textContent = message || ''; els.runStatus.dataset.active = message ? 'true' : 'false'; }
  function updateScrollAffordance() {
    const distance = els.chatScroll.scrollHeight - els.chatScroll.scrollTop - els.chatScroll.clientHeight;
    const visible = distance > 120;
    els.scrollToBottom.classList.toggle('hidden', !visible);
    els.scrollToBottom.setAttribute('aria-hidden', String(!visible));
  }
  function scrollToBottom() { els.chatScroll.scrollTo({ top: els.chatScroll.scrollHeight, behavior: 'smooth' }); }
  function updateEphemeralToggle() {
    const ephemeral = Boolean(currentOrNewSession().ephemeral);
    els.ephemeralToggle.setAttribute('aria-pressed', String(ephemeral));
    els.ephemeralToggle.classList.toggle('active', ephemeral);
    els.ephemeralToggle.querySelector('.mode-toggle-label').textContent = ephemeral ? 'Efêmera' : 'Persistente';
    els.ephemeralToggle.title = ephemeral ? 'Sessão efêmera: não salvar no histórico' : 'Sessão persistente: salvar no histórico';
    if (els.chatContext) els.chatContext.textContent = `Projeto ${currentOrNewSession().project || 'Geral'} · ${ephemeral ? 'Sessão efêmera' : 'Sessão persistente'}`;
  }
  function syncModeControls() {
    const modeLabels = { normal: 'Normal', plan: 'Plan', driven: 'Driven code' };
    const actionLabel = els.actionModeSelect.value === 'full-access' ? 'Full-access' : 'Ação normal';
    els.runModeLabel.textContent = modeLabels[els.runModeSelect.value] || 'Normal';
    els.actionModeLabel.textContent = actionLabel;
  }
  function closePopovers() { document.querySelectorAll('.control-popover').forEach((node) => node.classList.add('hidden')); document.querySelectorAll('[data-popover]').forEach((node) => node.setAttribute('aria-expanded', 'false')); }
  function toggleEphemeral() {
    const session = currentOrNewSession();
    session.ephemeral = !session.ephemeral;
    session.updatedAt = Date.now();
    persistSessions();
    updateEphemeralToggle();
    renderSessions();
    setRunStatus(session.ephemeral ? 'Sessão efêmera ativada · não será salva ao sair' : 'Sessão persistente ativada');
  }
  function toggleArchive(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || (session.id === currentSession?.id && isSending)) return;
    session.archived = !session.archived;
    session.updatedAt = Date.now();
    persistSessions();
    renderSessions();
  }
  function requestDelete(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || (session.id === currentSession?.id && isSending)) return;
    pendingDeleteId = sessionId;
    els.confirmCopy.textContent = `“${session.title || 'Nova sessão'}” será removida deste dispositivo. Esta ação não pode ser desfeita.`;
    els.confirmModal.classList.remove('hidden');
  }
  function closeConfirm() { pendingDeleteId = null; els.confirmModal.classList.add('hidden'); }
  function confirmDelete() {
    if (!pendingDeleteId) return;
    const index = sessions.findIndex((item) => item.id === pendingDeleteId);
    if (index < 0) return closeConfirm();
    if (sessions[index].id === currentSession?.id) currentSession = sessions[index + 1] || sessions[index - 1] || createSession();
    sessions.splice(index, 1);
    persistSessions();
    closeConfirm();
    renderSessions(); renderModelOptions(); renderMessages(); updateEphemeralToggle();
  }
  function openProject() { els.projectName.value = ''; els.projectFolder.value = ''; els.projectState.textContent = ''; els.projectModal.classList.remove('hidden'); els.projectName.focus(); }
  function closeProject() { els.projectModal.classList.add('hidden'); }
  async function chooseProjectFolder() { const folder = await window.sensix.chooseFolder(); if (folder) els.projectFolder.value = folder; }
  function createProject(event) { event.preventDefault(); const name = els.projectName.value.trim(); const folder = els.projectFolder.value.trim(); if (!name || !folder) { els.projectState.textContent = 'Informe o nome e escolha uma pasta.'; els.projectState.className = 'form-state error'; return; } if (!projects.some((item) => item.name.toLowerCase() === name.toLowerCase())) projects.push({ name, folder }); localStorage.setItem('sensix-projects-v1', JSON.stringify(projects)); currentOrNewSession().project = name; persistSessions(); closeProject(); renderSessions(); }
  function toggleToolTimeline(messageId) {
    const message = currentOrNewSession().messages.find((item, index) => (item.id || `message-${index}`) === messageId);
    if (!message) return;
    message.stepsCollapsed = message.stepsCollapsed !== true;
    persistSessions();
    renderMessages();
  }
  function setSending(value) {
    isSending = value;
    els.composerInput.disabled = value;
    els.sendButton.classList.toggle('stop', value);
    els.sendButton.innerHTML = value ? '<span>Parar</span>' + `<span class="svg-icon">${iconMarkup('close')}</span>` : '<span>Enviar</span>' + `<span class="svg-icon">${iconMarkup('arrowUp')}</span>`;
  }
  async function refreshModels() {
    if (!settings.configured) { setConnection('idle', 'Configure uma chave para começar'); showSettings(); return; }
    setRunStatus('Carregando catálogo SENSIX...');
    try {
      models = await window.sensix.listModels();
      renderModelOptions();
      setConnection('online', `${models.length} modelos disponíveis`);
      setRunStatus('');
    } catch (error) {
      models = [];
      renderModelOptions();
      setConnection('error', error.message || 'Não foi possível carregar modelos');
      setRunStatus('Não foi possível carregar o catálogo. Verifique a configuração do gateway.');
    }
  }
  async function saveSettings(event) {
    event.preventDefault();
    els.saveSettingsButton.disabled = true;
    setSettingsState('Validando conexão com o gateway...');
    try {
      settings = await window.sensix.saveSettings({ baseUrl: els.baseUrlInput.value, token: els.apiKeyInput.value });
      localStorage.setItem('sensix-action-mode', els.actionModeInput.value);
      localStorage.setItem('sensix-theme', els.themeInput.value);
      document.documentElement.dataset.theme = els.themeInput.value;
      hideSettings();
      setConnection('idle', 'Testando catálogo...');
      await refreshModels();
    } catch (error) {
      setSettingsState(error.message || 'Não foi possível salvar a configuração.', 'error');
    } finally { els.saveSettingsButton.disabled = false; }
  }
  async function clearSettings() {
    settings = await window.sensix.clearSettings();
    models = [];
    renderModelOptions();
    setConnection('idle', 'Configuração restaurada para a A100');
    setSettingsState('Endpoint padrão da A100 restaurado.', 'success');
    await refreshModels();
  }
  function openSession(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    currentSession = session;
    renderSessions();
    renderModelOptions();
    renderMessages();
    renderTodos(session.todos || []);
    updateEphemeralToggle();
  }
  function newSession() {
    if (isSending) return;
    currentSession = createSession();
    sessions.unshift(currentSession);
    persistSessions();
    renderSessions();
    renderModelOptions();
    renderMessages();
    updateEphemeralToggle();
    els.composerInput.focus();
  }
  function useSuggestion(prompt) { els.composerInput.value = prompt; autoResize(); els.composerInput.focus(); }

  function renderAttachments() {
    if (!els.attachmentsBar) return;
    const hasItems = attachments.length > 0;
    els.attachmentsBar.classList.toggle('hidden', !hasItems);
    els.attachmentsBar.innerHTML = attachments.map((item, idx) => {
      const iconName = item.type === 'folder' ? 'folder' : item.isImage ? 'image' : 'file';
      const badge = item.count ? `${item.count} itens` : item.size ? `${Math.round(item.size / 1024)} KB` : '';
      return `<div class="attachment-chip" title="${escapeHtml(item.path)}">
        <span class="svg-icon" data-icon="${iconName}">${icons[iconName] || icons.file}</span>
        <span class="attachment-name">${escapeHtml(item.name || item.path)}</span>
        ${badge ? `<span class="attachment-badge">${escapeHtml(badge)}</span>` : ''}
        <button type="button" class="attachment-remove" data-action="remove-attachment" data-index="${idx}" aria-label="Remover anexo">✕</button>
      </div>`;
    }).join('');
  }

  async function attachFolder() {
    try {
      const folderPath = await window.sensix.chooseFolder();
      if (!folderPath) return;
      const info = await window.sensix.inspectFolder(folderPath);
      if (!info.ok) { setRunStatus(`Não foi possível ler a pasta: ${info.error}`); return; }
      const name = folderPath.split(/[\\/]/).filter(Boolean).pop() || folderPath;
      attachments.push({ type: 'folder', name, path: folderPath, count: info.count, items: info.items });
      renderAttachments();
      setRunStatus(`Pasta anexada: ${name} (${info.count} itens)`);
    } catch (err) {
      setRunStatus(`Erro ao anexar pasta: ${err.message}`);
    }
  }

  async function attachFiles() {
    try {
      const filePaths = await window.sensix.chooseFiles();
      if (!filePaths || !filePaths.length) return;
      for (const filePath of filePaths) {
        const preview = await window.sensix.readFilePreview(filePath);
        if (preview.ok) {
          attachments.push({
            type: 'file',
            name: preview.name,
            path: filePath,
            size: preview.size,
            isImage: preview.isImage,
            base64: preview.base64,
            content: preview.content
          });
        }
      }
      renderAttachments();
      setRunStatus(`${filePaths.length} arquivo(s) anexado(s).`);
    } catch (err) {
      setRunStatus(`Erro ao anexar arquivos: ${err.message}`);
    }
  }

  async function sendMessage() {
    if (isSending) { if (activeRunId) await window.sensix.cancelChat(activeRunId); return; }
    const content = els.composerInput.value.trim();
    if (!content && attachments.length === 0) return;

    if (content.startsWith('/')) {
      const parts = content.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      els.composerInput.value = '';
      autoResize();

      const session = currentOrNewSession();
      if (cmd === '/clear') {
        session.messages = [];
        session.todos = [];
        renderTodos([]);
        persistSessions();
        renderMessages();
        setRunStatus('Chat limpo.');
        return;
      }
      if (cmd === '/todo') {
        if (els.todoContainer) {
          els.todoContainer.classList.toggle('hidden');
          setRunStatus(els.todoContainer.classList.contains('hidden') ? 'Checklist oculto.' : 'Checklist visível.');
        }
        return;
      }
      if (cmd === '/compact') {
        if (session.messages.length > 4) {
          const lastFew = session.messages.slice(-2);
          session.messages = [
            { id: 'compact-note', role: 'assistant', content: `🧹 **Sessão Compactada (Claude Code)**: ${session.messages.length - 2} mensagens anteriores arquivadas. Contexto limpo mantido.` },
            ...lastFew
          ];
          persistSessions();
          renderMessages();
          setRunStatus('Contexto da sessão compactado com sucesso.');
        } else {
          setRunStatus('Poucas mensagens para compactar.');
        }
        return;
      }
      if (cmd === '/init') {
        try {
          const res = await window.sensix.initProjectRules(session.projectFolder || '.');
          session.messages.push({
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: res.ok
              ? `📄 **Arquivo de Diretrizes Criado com Sucesso**: \`${res.path}\`\n\nO agente lerá este arquivo automaticamente em todas as tarefas deste workspace.`
              : `⚠️ ${res.error}`
          });
        } catch (e) {
          session.messages.push({ id: `msg-${Date.now()}`, role: 'assistant', content: `Erro ao criar regras: ${e.message}` });
        }
        persistSessions();
        renderMessages();
        return;
      }
      if (cmd === '/rules') {
        try {
          const rules = await window.sensix.getProjectRules(session.projectFolder || '.');
          session.messages.push({
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: rules && rules.found
              ? `📋 **Diretrizes Ativas (\`${rules.file}\`):**\n\n\`\`\`markdown\n${rules.content}\n\`\`\``
              : `ℹ️ Nenhuma diretriz encontrada na raiz (\`SENSIX.md\`, \`CLAUDE.md\`, \`AGENTS.md\`). Digite \`/init\` para gerar uma!`
          });
        } catch (e) {
          session.messages.push({ id: `msg-${Date.now()}`, role: 'assistant', content: `Erro ao buscar regras: ${e.message}` });
        }
        persistSessions();
        renderMessages();
        return;
      }
    }

    if (!settings.configured) { showSettings(); return; }
    const model = els.modelSelect.value || currentSession?.model;
    if (!model) { setRunStatus('Carregue um modelo antes de enviar.'); return; }
    const session = currentOrNewSession();
    session.model = model;

    const currentAttachments = [...attachments];
    let fullContent = content || 'Analise os anexos fornecidos.';
    if (currentAttachments.length > 0) {
      const parts = ['[CONTEXTO DE ANEXOS FORNECIDOS PELO USUÁRIO]:'];
      for (const att of currentAttachments) {
        if (att.type === 'folder') {
          const filesSummary = att.items ? att.items.slice(0, 40).map((i) => `  - ${i.name} (${i.type}${i.size ? `, ${i.size}B` : ''})`).join('\n') : '';
          parts.push(`PASTA: "${att.path}" (${att.count} itens encontrados)\nArquivos identificados:\n${filesSummary}`);
        } else if (att.type === 'file') {
          if (att.isImage) parts.push(`IMAGEM: "${att.path}" (${att.size} bytes)`);
          else parts.push(`ARQUIVO: "${att.path}" (${att.size} bytes)\nConteúdo:\n${att.content}`);
        }
      }
      if (content) parts.push(`INSTRUÇÃO DO USUÁRIO:\n${content}`);
      fullContent = parts.join('\n\n');
    }

    const steer = steerInstruction ? `\n\nSTEER DO USUÁRIO (aplicar neste turno): ${steerInstruction}` : '';
    const modeInstruction = runMode === 'plan' ? '\nMODO PLAN: não execute ferramentas; produza um plano com etapas, riscos e perguntas de confirmação.' : runMode === 'driven' ? '\nMODO DRIVEN CODE: execute o trabalho incrementalmente; quando houver ambiguidade ou risco, pare e faça uma pergunta objetiva antes de continuar.' : '';
    const requestMessages = [{ role: 'system', content: SYSTEM_PROMPT + modeInstruction + steer }, ...session.messages.map(({ role, content: text }) => ({ role, content: text })), { role: 'user', content: fullContent }];
    steerInstruction = '';
    els.steerInput.value = '';
    els.steerPanel.classList.add('hidden');
    session.messages.push({
      role: 'user',
      content: fullContent,
      displayContent: content || (currentAttachments.length ? `[${currentAttachments.length} anexo(s)]` : ''),
      attachments: currentAttachments
    }, { id: crypto.randomUUID(), role: 'assistant', content: '', steps: [] });
    if (session.title === 'Nova sessão') session.title = (content || 'Análise de arquivos').slice(0, 42) + (content.length > 42 ? '…' : '');
    session.updatedAt = Date.now();
    els.composerInput.value = '';
    attachments = [];
    renderAttachments();
    autoResize();
    persistSessions();
    renderSessions();
    renderMessages();
    setSending(true);
    setRunStatus(`Executando ${model}...`);
    try {
      const result = await window.sensix.sendChat({ model, messages: requestMessages, temperature: 0.2, mode: runMode, actionMode: els.actionModeSelect.value });
      activeRunId = result.runId;
    } catch (error) {
      session.messages[session.messages.length - 1].content = `Não foi possível iniciar a execução: ${error.message || 'erro desconhecido'}`;
      setSending(false);
      setRunStatus('');
      renderMessages();
    }
  }
  function handleChatEvent(event) {
    if (!event || event.runId !== activeRunId) return;
    const session = currentOrNewSession();
    const assistant = session.messages[session.messages.length - 1];
    if (!assistant || assistant.role !== 'assistant') return;
    if (event.type === 'start') setRunStatus('Agente analisando a tarefa...');
    if (event.type === 'tool_start') {
      if (!Array.isArray(assistant.steps)) assistant.steps = [];
      assistant.steps.push({ id: event.toolId, tool: event.tool, description: event.description, status: 'running' });
      setRunStatus(event.description || `Executando ${event.tool}...`);
      persistSessions();
      renderMessages();
    }
    if (event.type === 'tool_done') {
      if (!Array.isArray(assistant.steps)) assistant.steps = [];
      const step = assistant.steps.find((item) => item.id === event.toolId);
      if (step) Object.assign(step, { status: event.ok ? 'done' : 'error', summary: event.summary });
      setRunStatus(event.ok ? `${event.tool} concluída` : `${event.tool} falhou`);
      persistSessions();
      renderMessages();
    }
    if (event.type === 'todo_update') {
      session.todos = event.todos;
      renderTodos(event.todos);
      persistSessions();
    }
    if (event.type === 'synthesizing') setRunStatus(event.message || 'Sintetizando resultado...');
    if (event.type === 'token') { assistant.content += event.content || ''; persistSessions(); renderMessages(); }
    if (event.type === 'usage') setRunStatus('Resposta concluída · uso registrado pelo gateway');
    if (event.type === 'done') { session.updatedAt = Date.now(); persistSessions(); setSending(false); activeRunId = null; setRunStatus(''); renderSessions(); renderMessages(); }
    if (event.type === 'cancelled') { setSending(false); activeRunId = null; setRunStatus('Execução interrompida.'); persistSessions(); renderMessages(); }
    if (event.type === 'error') { assistant.content += `\n\nFalha: ${event.message || 'o gateway retornou um erro.'}`; setSending(false); activeRunId = null; setRunStatus('Execução encerrada com erro.'); persistSessions(); renderMessages(); }
  }
  function autoResize() { els.composerInput.style.height = 'auto'; els.composerInput.style.height = `${Math.min(els.composerInput.scrollHeight, 180)}px`; }

  document.body.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'copy-code') {
      const codeBlock = target.closest('.code-block');
      const codeEl = codeBlock?.querySelector('pre code');
      if (codeEl) {
        try {
          await navigator.clipboard.writeText(codeEl.textContent || '');
          const original = target.textContent;
          target.textContent = 'Copiado!';
          target.classList.add('copied');
          setTimeout(() => {
            target.textContent = original;
            target.classList.remove('copied');
          }, 2000);
        } catch {
          target.textContent = 'Erro ao copiar';
        }
      }
      return;
    }
    if (action === 'toggle-todo-list') {
      if (els.todoList) {
        els.todoList.classList.toggle('collapsed');
        target.textContent = els.todoList.classList.contains('collapsed') ? 'Expandir' : 'Ocultar';
      }
    }
    if (action === 'new-session') newSession();
    if (action === 'open-settings') showSettings();
    if (action === 'close-settings') hideSettings();
    if (action === 'clear-settings') await clearSettings();
    if (action === 'refresh-models') await refreshModels();
    if (action === 'open-session') openSession(target.dataset.sessionId);
    if (action === 'toggle-archive') { event.stopPropagation(); toggleArchive(target.dataset.sessionId); }
    if (action === 'toggle-archived') { showArchived = !showArchived; target.textContent = showArchived ? 'Ocultar arquivados' : 'Arquivados'; renderSessions(); }
    if (action === 'request-delete') { event.stopPropagation(); requestDelete(target.dataset.sessionId); }
    if (action === 'close-confirm') closeConfirm();
    if (action === 'confirm-delete') confirmDelete();
    if (action === 'new-project') openProject();
    if (action === 'close-project') closeProject();
    if (action === 'choose-project-folder') await chooseProjectFolder();
    if (action === 'toggle-steer') { els.steerPanel.classList.toggle('hidden'); if (!els.steerPanel.classList.contains('hidden')) els.steerInput.focus(); }
    if (action === 'apply-steer') { steerInstruction = els.steerInput.value.trim(); els.steerPanel.classList.add('hidden'); setRunStatus(steerInstruction ? 'Steer preparado para o próximo turno.' : 'Steer removido.'); }
    if (action === 'toggle-ephemeral') toggleEphemeral();
    if (action === 'toggle-tool-timeline') toggleToolTimeline(target.dataset.messageId);
    if (action === 'scroll-to-bottom') scrollToBottom();
    if (action === 'toggle-popover') {
      const popover = document.getElementById(target.dataset.popover);
      const wasHidden = popover?.classList.contains('hidden');
      closePopovers();
      if (popover && wasHidden) { popover.classList.remove('hidden'); target.setAttribute('aria-expanded', 'true'); }
    }
    if (action === 'choose-mode') { runMode = target.dataset.mode || 'normal'; els.runModeSelect.value = runMode; syncModeControls(); closePopovers(); }
    if (action === 'choose-action-mode') { const value = target.dataset.mode === 'full-access' ? 'full-access' : 'normal'; els.actionModeSelect.value = value; localStorage.setItem('sensix-action-mode', value === 'full-access' ? 'full-access' : 'guarded'); syncModeControls(); closePopovers(); }
    if (action === 'attach-folder') await attachFolder();
    if (action === 'attach-file') await attachFiles();
    if (action === 'remove-attachment') {
      const idx = parseInt(target.dataset.index, 10);
      if (!isNaN(idx)) { attachments.splice(idx, 1); renderAttachments(); }
    }
    if (action === 'window-minimize') window.sensix.window.minimize();
    if (action === 'window-maximize') window.sensix.window.maximize();
    if (action === 'window-close') window.sensix.window.close();
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.composerForm.classList.add('drag-active');
  });
  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null || e.clientX === 0 || e.clientY === 0) {
      els.composerForm.classList.remove('drag-active');
    }
  });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    els.composerForm.classList.remove('drag-active');
    const files = e.dataTransfer?.files;
    if (!files || !files.length) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const itemPath = f.path;
      if (!itemPath) continue;
      const folderInfo = await window.sensix.inspectFolder(itemPath);
      if (folderInfo && folderInfo.ok) {
        const name = itemPath.split(/[\\/]/).filter(Boolean).pop() || itemPath;
        attachments.push({ type: 'folder', name, path: itemPath, count: folderInfo.count, items: folderInfo.items });
      } else {
        const fileInfo = await window.sensix.readFilePreview(itemPath);
        if (fileInfo && fileInfo.ok) {
          attachments.push({
            type: 'file',
            name: fileInfo.name,
            path: itemPath,
            size: fileInfo.size,
            isImage: fileInfo.isImage,
            base64: fileInfo.base64,
            content: fileInfo.content
          });
        }
      }
    }
    renderAttachments();
    setRunStatus(`${files.length} item(ns) anexado(s) via arrastar e soltar.`);
  });
  els.settingsForm.addEventListener('submit', saveSettings);
  els.composerForm.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(); });
  els.composerInput.addEventListener('input', autoResize);
  els.composerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  });
  els.modelSelect.addEventListener('change', () => { currentOrNewSession().model = els.modelSelect.value; persistSessions(); });
  els.chatScroll.addEventListener('scroll', updateScrollAffordance, { passive: true });
  els.projectFilter.addEventListener('change', renderSessions);
  els.projectForm.addEventListener('submit', createProject);
  els.runModeSelect.addEventListener('change', () => { runMode = els.runModeSelect.value; syncModeControls(); });
  els.actionModeSelect.addEventListener('change', () => { localStorage.setItem('sensix-action-mode', els.actionModeSelect.value === 'full-access' ? 'full-access' : 'guarded'); if (els.actionModeInput) els.actionModeInput.value = els.actionModeSelect.value === 'full-access' ? 'full-access' : 'guarded'; syncModeControls(); });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); newSession(); }
    if (event.key === 'Escape' && !els.settingsModal.classList.contains('hidden')) hideSettings();
    if (event.key === 'Escape' && !els.confirmModal.classList.contains('hidden')) closeConfirm();
  });
  els.settingsModal.addEventListener('click', (event) => { if (event.target === els.settingsModal) hideSettings(); });
  els.confirmModal.addEventListener('click', (event) => { if (event.target === els.confirmModal) closeConfirm(); });

  async function init() {
    renderIcons();
    try {
      const durable = await window.sensix.loadSessions();
      if (Array.isArray(durable) && durable.length) { sessions = durable.map((session) => ({ ...session, ephemeral: Boolean(session.ephemeral), archived: Boolean(session.archived), project: String(session.project || 'Geral'), messages: Array.isArray(session.messages) ? session.messages : [] })); }
    } catch {}
    currentSession = sessions[0] || createSession();
    renderSessions();
    renderMessages();
    updateEphemeralToggle();
    updateScrollAffordance();
    removeChatListener = window.sensix.onChatEvent(handleChatEvent);
    settings = await window.sensix.getSettings();
    document.documentElement.dataset.theme = localStorage.getItem('sensix-theme') || 'obsidian';
    els.actionModeSelect.value = localStorage.getItem('sensix-action-mode') === 'full-access' ? 'full-access' : 'normal';
    const permissions = settings.permissions || {};
    els.permissionSummary.textContent = permissions.shell && permissions.filesWrite ? 'Shell + Coding' : 'Acesso limitado';
    if (settings.configured) await refreshModels(); else { setConnection('idle', 'Configure uma chave para começar'); showSettings(); }
  }
  window.addEventListener('error', () => setRunStatus('O renderer encontrou um erro. Consulte o log de auditoria.'));
  window.addEventListener('unhandledrejection', () => setRunStatus('Uma operação assíncrona falhou. Consulte o log de auditoria.'));
  window.addEventListener('beforeunload', () => { persistSessions(); if (removeChatListener) removeChatListener(); });
  init();
})();
