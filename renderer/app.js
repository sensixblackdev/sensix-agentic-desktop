(function () {
  'use strict';

  const SESSION_KEY = 'sensix-agentic-sessions-v1';
  const SYSTEM_PROMPT = 'Você é um agente de coding AXION com tools reais. Use shell e arquivos quando necessário e reporte apenas resultados verificados.';
  const els = {
    sessionList: document.getElementById('session-list'),
    modelSelect: document.getElementById('model-select'),
    emptyState: document.getElementById('empty-state'),
    messageList: document.getElementById('message-list'),
    chatScroll: document.getElementById('chat-scroll'),
    composerForm: document.getElementById('composer-form'),
    composerInput: document.getElementById('composer-input'),
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
    chatContext: document.getElementById('chat-context'),
    runModeButton: document.getElementById('run-mode-button'), runModeLabel: document.getElementById('run-mode-label'),
    actionModeButton: document.getElementById('action-mode-button'), actionModeLabel: document.getElementById('action-mode-label'),
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
      if (model.id === 'gpt-oss-120b') return 'GPT-OSS 120B · código + tools';
      if (model.id === 'qwen3-32b') return 'Qwen3 32B · rápido';
      return model.id;
    };
    els.modelSelect.innerHTML = models.length
      ? models.map((model) => `<option value="${escapeHtml(model.id)}" title="${escapeHtml(model.description)}" ${model.id === selected ? 'selected' : ''}>${escapeHtml(displayModelName(model))}</option>`).join('')
      : '<option value="">Nenhum modelo carregado</option>';
    if (currentSession && selected) currentSession.model = selected;
  }
  function renderMarkdown(text) {
    const lines = String(text || '').split(/\r?\n/);
    const output = [];
    let inCode = false;
    let codeLines = [];
    let paragraph = [];
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const content = paragraph.join('\n').trim();
      if (content) output.push(`<p>${escapeHtml(content).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`);
      paragraph = [];
    };
    lines.forEach((line) => {
      if (line.trim().startsWith('```')) {
        if (inCode) {
          output.push(`<details class="artifact-block"><summary>Código · ${codeLines.length} linhas</summary><pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre></details>`);
          codeLines = [];
        } else flushParagraph();
        inCode = !inCode;
        return;
      }
      if (inCode) codeLines.push(line);
      else if (/^#{1,3}\s+/.test(line.trim())) { flushParagraph(); const heading = line.trim().match(/^(#{1,3})\s+(.+)$/); output.push(`<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`); }
      else if (!line.trim()) flushParagraph();
      else paragraph.push(line);
    });
    if (inCode) output.push(`<details class="artifact-block"><summary>Código · ${codeLines.length} linhas</summary><pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre></details>`);
    flushParagraph();
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
      const needsAnswer = message.role === 'assistant' && /\?\s*$/.test(String(message.content || '').trim());
      const isPlan = message.role === 'assistant' && /(^|\n)#{1,3}\s*(plano|plan|etapas)/i.test(String(message.content || ''));
      return `<article class="message ${message.role === 'user' ? 'user' : 'assistant'} ${needsAnswer ? 'question-card' : ''} ${isPlan ? 'plan-card' : ''}" data-message-id="${escapeHtml(messageId)}"><div class="message-avatar" aria-hidden="true">${message.role === 'user' ? 'U' : 'S'}</div><div><div class="message-meta">${message.role === 'user' ? 'Você' : needsAnswer ? 'SENSIX Agent · precisa da sua decisão' : isPlan ? 'SENSIX Agent · plano' : 'SENSIX Agent'}</div>${stepsMarkup}<div class="message-body">${renderMarkdown(message.content)}</div></div></article>`;
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
  async function sendMessage() {
    if (isSending) { if (activeRunId) await window.sensix.cancelChat(activeRunId); return; }
    const content = els.composerInput.value.trim();
    if (!content) return;
    if (!settings.configured) { showSettings(); return; }
    const model = els.modelSelect.value || currentSession?.model;
    if (!model) { setRunStatus('Carregue um modelo antes de enviar.'); return; }
    const session = currentOrNewSession();
    session.model = model;
    const steer = steerInstruction ? `\n\nSTEER DO USUÁRIO (aplicar neste turno): ${steerInstruction}` : '';
    const modeInstruction = runMode === 'plan' ? '\nMODO PLAN: não execute ferramentas; produza um plano com etapas, riscos e perguntas de confirmação.' : runMode === 'driven' ? '\nMODO DRIVEN CODE: execute o trabalho incrementalmente; quando houver ambiguidade ou risco, pare e faça uma pergunta objetiva antes de continuar.' : '';
    const requestMessages = [{ role: 'system', content: SYSTEM_PROMPT + modeInstruction + steer }, ...session.messages.map(({ role, content: text }) => ({ role, content: text })), { role: 'user', content }];
    steerInstruction = '';
    els.steerInput.value = '';
    els.steerPanel.classList.add('hidden');
    session.messages.push({ role: 'user', content }, { id: crypto.randomUUID(), role: 'assistant', content: '', steps: [] });
    if (session.title === 'Nova sessão') session.title = content.slice(0, 42) + (content.length > 42 ? '…' : '');
    session.updatedAt = Date.now();
    els.composerInput.value = '';
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
    if (action === 'suggestion') useSuggestion(target.dataset.prompt || '');
    if (action === 'window-minimize') window.sensix.window.minimize();
    if (action === 'window-maximize') window.sensix.window.maximize();
    if (action === 'window-close') window.sensix.window.close();
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
