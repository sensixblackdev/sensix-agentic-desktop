const { app, BrowserWindow, ipcMain, safeStorage, shell, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const DEFAULT_BASE_URL = process.env.SENSIX_API_BASE_URL || 'https://api.sensix.it.com/v1';
const LEGACY_BASE_URL = 'http://174.78.228.101:40746/v1';
const SENSIX_GATEWAY_HOSTS = ['api.sensix.it.com', 'sensix.it.com'];
const WORKSPACE_ROOT = path.resolve(process.env.SENSIX_WORKSPACE_ROOT || 'D:\\WORKSPACE');
const MAX_TOOL_OUTPUT = 24 * 1024;
const MAX_MODEL_TOOL_OUTPUT = 3 * 1024;
const MAX_LIST_RESULTS = 60;
const MAX_FILE_WRITE = 512 * 1024;
const MAX_SAME_TOOL_CALLS = 3;
const activeRuns = new Map();
let mainWindow = null;

const AGENT_SYSTEM_PROMPT = [
  'Você é o agente de engenharia SENSIX/AXION executando dentro de um app Electron.',
  'Use ferramentas reais para inspecionar, editar, pesquisar e validar código quando a solicitação exigir ação.',
  'O workspace autorizado é D:\\WORKSPACE. Arquivos .env podem ser usados apenas como configuração local: nunca leia, exiba ou envie seus valores ao gateway; execute comandos localmente e reporte somente o resultado não sensível.',
  'Antes de editar, leia os arquivos relevantes. Depois de editar, valide com comandos proporcionais ao risco.',
  'Após obter evidência suficiente, entregue a síntese final. Não repita a mesma ferramenta com os mesmos argumentos; trate resultado vazio, falha ou ausência de progresso como sinal para mudar de abordagem ou relatar o bloqueio.',
  'Não invente saídas de ferramentas. Não exponha tags XML, JSON bruto de tool calls, raciocínio interno ou segredos.',
  'Ações destrutivas, deleções recursivas, formatação de disco, reset hard e comandos de energia são proibidos.',
  'Entregue uma síntese curta em Markdown com arquivos alterados e evidências factuais.',
].join(' ');

const TOOL_DEFINITIONS = [
  tool('list_files', 'Lista arquivos e diretórios dentro do workspace autorizado.', {
    path: { type: 'string', description: 'Caminho relativo a D:\\WORKSPACE. Use . para a raiz.' },
    max_results: { type: 'integer', minimum: 1, maximum: 500 },
  }, ['path']),
  tool('read_file', 'Lê um arquivo de texto do workspace, opcionalmente por intervalo de linhas.', {
    path: { type: 'string' },
    start_line: { type: 'integer', minimum: 1 },
    end_line: { type: 'integer', minimum: 1 },
  }, ['path']),
  tool('search_text', 'Pesquisa texto com ripgrep dentro do workspace.', {
    query: { type: 'string' },
    path: { type: 'string', description: 'Diretório relativo; padrão .' },
    max_results: { type: 'integer', minimum: 1, maximum: 200 },
  }, ['query']),
  tool('write_file', 'Cria ou sobrescreve atomicamente um arquivo de texto dentro do workspace.', {
    path: { type: 'string' }, content: { type: 'string' },
  }, ['path', 'content']),
  tool('replace_in_file', 'Substitui texto exato em um arquivo dentro do workspace.', {
    path: { type: 'string' }, old_text: { type: 'string' }, new_text: { type: 'string' }, replace_all: { type: 'boolean' },
  }, ['path', 'old_text', 'new_text']),
  tool('shell_exec', 'Executa PowerShell real para coding, Git, diagnóstico e validação. Comandos destrutivos e acesso a segredos são bloqueados.', {
    command: { type: 'string' },
    cwd: { type: 'string', description: 'Diretório relativo ao workspace; padrão .' },
    timeout_ms: { type: 'integer', minimum: 1000, maximum: 120000 },
  }, ['command']),
];

function tool(name, description, properties, required) {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } };
}

function credentialsPath() { return path.join(app.getPath('userData'), 'sensix-credentials.json'); }
function sessionsPath() { return path.join(app.getPath('userData'), 'sensix-sessions.json'); }
function auditPath() { return path.join(app.getPath('userData'), 'logs', 'agent-audit.log'); }

function redactSecrets(value) {
  return String(value ?? '')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:ghp_|sk-|hf_|vcp_)[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_SECRET]')
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/<think>[\s\S]*?<\/think>/gi, '');
}

function writeAudit(level, message, details = {}, traceId = crypto.randomUUID()) {
  try {
    const file = auditPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file) && fs.statSync(file).size > 5 * 1024 * 1024) {
      fs.rmSync(`${file}.1`, { force: true });
      fs.renameSync(file, `${file}.1`);
    }
    const entry = {
      timestamp: new Date().toISOString(), level, service: 'sensix-agentic-desktop', tenant_id: 'local-axion', trace_id: traceId,
      message: redactSecrets(message), details: JSON.parse(redactSecrets(JSON.stringify(details))),
    };
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
  } catch {}
}

function isTokenOptional(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || SENSIX_GATEWAY_HOSTS.includes(parsed.hostname);
  } catch { return false; }
}

function normalizeBaseUrl(value) {
  const candidate = String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  const parsed = new URL(candidate);
  const allowedHttp = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(allowedHttp && parsed.protocol === 'http:')) {
    throw new Error('A URL deve usar HTTPS; HTTP é permitido apenas para o endpoint Vast autorizado ou localhost.');
  }
  return candidate;
}

function readStoredCredentials() {
  const file = credentialsPath();
  if (!fs.existsSync(file)) return { baseUrl: DEFAULT_BASE_URL, token: null };
  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    const migrated = payload.baseUrl === LEGACY_BASE_URL ? DEFAULT_BASE_URL : payload.baseUrl;
    const token = payload.token && safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(payload.token, 'base64')) : null;
    return { baseUrl: normalizeBaseUrl(migrated), token: token || null };
  } catch { return { baseUrl: DEFAULT_BASE_URL, token: null }; }
}

function writeStoredCredentials(baseUrl, token) {
  if (!safeStorage.isEncryptionAvailable() && token) throw new Error('Armazenamento criptografado indisponível para guardar a chave.');
  const payload = {
    version: 3,
    baseUrl: normalizeBaseUrl(baseUrl),
    token: token ? safeStorage.encryptString(String(token)).toString('base64') : null,
  };
  fs.mkdirSync(path.dirname(credentialsPath()), { recursive: true });
  fs.writeFileSync(credentialsPath(), JSON.stringify(payload), { mode: 0o600 });
}

function publicSettings() {
  const stored = readStoredCredentials();
  return {
    baseUrl: stored.baseUrl,
    configured: Boolean(stored.token) || isTokenOptional(stored.baseUrl),
    tokenRequired: !isTokenOptional(stored.baseUrl),
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    permissions: { workspaceRoot: WORKSPACE_ROOT, shell: true, filesRead: true, filesWrite: true, destructiveCommands: false, secretsAccess: false },
  };
}

function extractToolCallsFromContent(content) {
  if (typeof content !== 'string') return [];
  let trimmed = content.trim();
  if (trimmed.startsWith('```json') && trimmed.endsWith('```')) trimmed = trimmed.slice(7, -3).trim();
  else if (trimmed.startsWith('```') && trimmed.endsWith('```')) trimmed = trimmed.slice(3, -3).trim();

  const authorized = ['list_files', 'read_file', 'search_text', 'write_file', 'replace_in_file', 'shell_exec'];
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      const name = parsed.name || parsed.function || parsed.tool;
      const args = parsed.arguments || parsed.parameters || parsed.args || {};
      if (name && authorized.includes(name)) {
        return [{
          id: `call_${crypto.randomUUID().slice(0, 8)}`,
          type: 'function',
          function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) }
        }];
      }
    } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const calls = [];
        for (const item of parsed) {
          if (item && typeof item === 'object') {
            const name = item.name || item.function || item.tool;
            const args = item.arguments || item.parameters || item.args || {};
            if (name && authorized.includes(name)) {
              calls.push({
                id: `call_${crypto.randomUUID().slice(0, 8)}`,
                type: 'function',
                function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) }
              });
            }
          }
        }
        if (calls.length > 0) return calls;
      }
    }
  } catch {}
  return [];
}

function requestHeaders(token, traceId, baseUrl) {
  const headers = { Accept: 'application/json', 'X-Trace-ID': traceId };
  if (token) {
    const isSensix = baseUrl && isTokenOptional(baseUrl);
    if (!isSensix || token.startsWith('sk-or-') || token.startsWith('sk-')) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

function sendChatEvent(event) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('chat:event', event);
}

function safeErrorMessage(error) {
  return redactSecrets(error?.message || 'Falha desconhecida').replace(/[A-Z]:\\[^\s]+/gi, '[SYSTEM_PATH]');
}

function ensureWorkspacePath(inputPath = '.') {
  const target = path.resolve(WORKSPACE_ROOT, String(inputPath || '.'));
  const relative = path.relative(WORKSPACE_ROOT, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('A ferramenta só pode acessar caminhos dentro de D:\\WORKSPACE.');
  const segments = relative.toLowerCase().split(path.sep);
  if (segments[0] === 'secure' && segments[1] === 'vault') throw new Error('Acesso ao Vault é bloqueado para o agente desktop.');
  return target;
}

function relativeWorkspacePath(target) { return path.relative(WORKSPACE_ROOT, target) || '.'; }
function isSecretPath(target) { return /(^|[\\/])\.env(?:\.|$)/i.test(relativeWorkspacePath(target)); }
function truncateOutput(value, limit = MAX_TOOL_OUTPUT) {
  const text = redactSecrets(value);
  if (Buffer.byteLength(text, 'utf8') <= limit) return text;
  return `${Buffer.from(text, 'utf8').subarray(0, limit).toString('utf8')}\n[OUTPUT_TRUNCATED]`;
}

function modelToolContent(result) {
  const raw = redactSecrets(JSON.stringify(result));
  if (Buffer.byteLength(raw, 'utf8') <= MAX_MODEL_TOOL_OUTPUT) return raw;
  const preview = Buffer.from(raw, 'utf8').subarray(0, MAX_MODEL_TOOL_OUTPUT).toString('utf8');
  return JSON.stringify({
    ok: result?.ok !== false,
    truncated: true,
    preview,
    note: 'Resultado reduzido para preservar o contexto do modelo.',
  });
}

async function fetchModels() {
  const { baseUrl, token } = readStoredCredentials();
  if (!token && !isTokenOptional(baseUrl)) throw new Error('Configure a chave do gateway antes de carregar os modelos.');
  const traceId = crypto.randomUUID();
  const response = await fetch(`${baseUrl}/models`, { headers: requestHeaders(token, traceId, baseUrl), signal: AbortSignal.timeout(20000) });
  const body = await response.text();
  if (!response.ok) throw new Error(`Endpoint recusou o catálogo (HTTP ${response.status}).`);
  let parsed;
  try { parsed = JSON.parse(body); } catch { throw new Error('O endpoint retornou um catálogo inválido.'); }
  return (Array.isArray(parsed?.data) ? parsed.data : []).filter((model) => typeof model?.id === 'string').map((model) => ({
    id: model.id, object: model.object || 'model', ownedBy: model.owned_by || 'sensix-ai',
    description: model.description || `${model.root || model.id} · Gateway SENSIX Multi-Tier`,
  }));
}

function parseToolArguments(raw) {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw || '{}')); } catch { throw new Error('O modelo retornou argumentos inválidos para a ferramenta.'); }
}

async function listFilesTool(args) {
  const root = ensureWorkspacePath(args.path || '.');
  const maxResults = Math.min(Math.max(Number(args.max_results) || MAX_LIST_RESULTS, 1), MAX_LIST_RESULTS);
  const results = [];
  const queue = [root];
  while (queue.length && results.length < maxResults) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .filter((entry) => !['node_modules', '.git', 'dist', 'build'].includes(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      results.push(`${entry.isDirectory() ? 'dir ' : 'file'} ${relativeWorkspacePath(absolute)}`);
      if (entry.isDirectory()) queue.push(absolute);
      if (results.length >= maxResults) break;
    }
  }
  return { ok: true, count: results.length, truncated: results.length >= maxResults, entries: results };
}

async function readFileTool(args) {
  const file = ensureWorkspacePath(args.path);
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error('O caminho informado não é um arquivo.');
  if (stat.size > 2 * 1024 * 1024) throw new Error('Arquivo maior que 2 MB; use pesquisa textual.');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const start = Math.min(Math.max(Number(args.start_line) || 1, 1), Math.max(lines.length, 1));
  const end = Math.min(Math.max(Number(args.end_line) || Math.min(start + 399, lines.length), start), lines.length);
  if (isSecretPath(file)) return { ok: true, path: relativeWorkspacePath(file), startLine: start, endLine: end, content: '[CONTEÚDO SUPRIMIDO: arquivo de segredos; use-o somente em comandos locais.]' };
  const content = lines.slice(start - 1, end).map((line, index) => `${start + index}: ${line}`).join('\n');
  return { ok: true, path: relativeWorkspacePath(file), startLine: start, endLine: end, content: truncateOutput(content) };
}

function runChildProcess(executable, args, options, timeoutMs, activeRun) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { ...options, windowsHide: true, shell: false });
    activeRun.child = child;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout?.on('data', (chunk) => { if (stdout.length < MAX_TOOL_OUTPUT) stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { if (stderr.length < MAX_TOOL_OUTPUT) stderr += chunk.toString(); });
    child.on('error', (error) => { clearTimeout(timer); activeRun.child = null; reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer); activeRun.child = null;
      resolve({ code: Number.isInteger(code) ? code : -1, stdout: truncateOutput(stdout), stderr: truncateOutput(stderr), timedOut });
    });
  });
}

async function searchTextTool(args, activeRun) {
  const target = ensureWorkspacePath(args.path || '.');
  const maxResults = Math.min(Math.max(Number(args.max_results) || 100, 1), 200);
  const result = await runChildProcess('rg', ['-n', '--hidden', '-g', '!node_modules', '-g', '!.git', '-g', '!.env', '-g', '!.env.*', '--max-count', String(maxResults), '--', String(args.query), target], { cwd: WORKSPACE_ROOT }, 30000, activeRun);
  if (result.code !== 0 && result.code !== 1) throw new Error(result.stderr || 'Falha ao executar ripgrep.');
  const matches = result.stdout.split(/\r?\n/).filter(Boolean).slice(0, maxResults);
  return { ok: true, count: matches.length, matches };
}

async function writeFileTool(args) {
  const file = ensureWorkspacePath(args.path);
  const content = String(args.content ?? '');
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_WRITE) throw new Error('Escrita excede 512 KB por chamada.');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.sensix-${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, content, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, file);
  return { ok: true, path: relativeWorkspacePath(file), bytes: Buffer.byteLength(content, 'utf8') };
}

async function replaceInFileTool(args) {
  const file = ensureWorkspacePath(args.path);
  const oldText = String(args.old_text ?? '');
  const newText = String(args.new_text ?? '');
  if (!oldText) throw new Error('old_text não pode ser vazio.');
  const current = fs.readFileSync(file, 'utf8');
  const occurrences = current.split(oldText).length - 1;
  if (occurrences === 0) throw new Error('Texto-alvo não encontrado; releia o arquivo antes de editar.');
  if (!args.replace_all && occurrences > 1) throw new Error(`Texto-alvo aparece ${occurrences} vezes; use replace_all ou mais contexto.`);
  const next = args.replace_all ? current.split(oldText).join(newText) : current.replace(oldText, newText);
  if (Buffer.byteLength(next, 'utf8') > MAX_FILE_WRITE) throw new Error('Arquivo resultante excede 512 KB.');
  const temporary = `${file}.sensix-${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, next, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, file);
  return { ok: true, path: relativeWorkspacePath(file), replacements: args.replace_all ? occurrences : 1 };
}

function validateShellCommand(command) {
  const normalized = String(command || '').trim();
  if (!normalized) throw new Error('Comando vazio.');
  const forbidden = [
    /secure[\\/]vault/i, /(?:^|[\\/])\.ssh(?:[\\/]|$)/i, /\bid_(?:rsa|ed25519)\b/i,
    /\b(?:remove-item|rm|rmdir|rd|del|erase)\b[^\n]*(?:-recurse|-r\b|\/s\b|\/q\b)/i,
    /\bgit\s+(?:reset\s+--hard|clean\s+-[^\s]*f|checkout\s+--)/i,
    /\b(?:format|diskpart|shutdown|stop-computer|restart-computer)\b/i,
    /\b(?:get-childitem|gci|dir)\s+env:/i,
  ];
  if (forbidden.some((pattern) => pattern.test(normalized))) throw new Error('Comando bloqueado pelos guardrails de segurança.');
  return normalized;
}

async function shellExecTool(args, activeRun) {
  const command = validateShellCommand(args.command);
  const cwd = ensureWorkspacePath(args.cwd || '.');
  const timeoutMs = Math.min(Math.max(Number(args.timeout_ms) || 60000, 1000), 120000);
  const powershell = process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe') : 'powershell.exe';
  const result = await runChildProcess(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { cwd, env: { ...process.env, SENSIX_AGENT_RUN: '1' } }, timeoutMs, activeRun);
  const touchesSecrets = /(?:^|[\s'"`])(?:[^\s'"`]*[\\/])?\.env(?:\.|\b)/i.test(command);
  return touchesSecrets
    ? { ok: result.code === 0 && !result.timedOut, cwd: relativeWorkspacePath(cwd), code: result.code, timedOut: result.timedOut, stdout: '[SAÍDA SUPRIMIDA: comando envolveu arquivo de configuração sensível]', stderr: result.stderr ? '[ERRO SUPRIMIDO: comando envolveu arquivo de configuração sensível]' : '' }
    : { ok: result.code === 0 && !result.timedOut, cwd: relativeWorkspacePath(cwd), ...result };
}

async function executeTool(name, args, activeRun) {
  if (name === 'list_files') return listFilesTool(args);
  if (name === 'read_file') return readFileTool(args);
  if (name === 'search_text') return searchTextTool(args, activeRun);
  if (name === 'write_file') return writeFileTool(args);
  if (name === 'replace_in_file') return replaceInFileTool(args);
  if (name === 'shell_exec') return shellExecTool(args, activeRun);
  throw new Error(`Ferramenta não autorizada: ${name}`);
}

async function requestAgentCompletion(baseUrl, token, messages, signal, traceId, model, { tools = TOOL_DEFINITIONS, toolChoice = 'auto' } = {}) {
  const body = { model, messages, parallel_tool_calls: false, stream: false, temperature: 0.1, max_tokens: 1024 };
  if (tools?.length) { body.tools = tools; body.tool_choice = toolChoice; }
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { ...requestHeaders(token, traceId, baseUrl), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Falha no endpoint GPU (HTTP ${response.status}): ${raw.slice(0, 240)}`);
  try { return JSON.parse(raw); } catch { throw new Error('O endpoint GPU retornou JSON inválido.'); }
}

function describeTool(name, args) {
  if (name === 'shell_exec') return `PowerShell: ${truncateOutput(args.command || '', 180)}`;
  if (name === 'read_file') return `Lendo ${args.path}`;
  if (name === 'write_file') return `Gravando ${args.path}`;
  if (name === 'replace_in_file') return `Editando ${args.path}`;
  if (name === 'search_text') return `Buscando “${args.query}”`;
  if (name === 'list_files') return `Listando ${args.path || '.'}`;
  return `Executando ${name}`;
}

function summarizeTool(name, result) {
  if (name === 'shell_exec') return `Comando finalizado com código ${result.code}${result.timedOut ? ' (timeout)' : ''}.`;
  if (name === 'list_files') return `${result.count} itens encontrados.`;
  if (name === 'search_text') return `${result.count} ocorrências encontradas.`;
  if (name === 'read_file') return `Linhas ${result.startLine}-${result.endLine} lidas.`;
  if (name === 'write_file') return `${result.bytes} bytes gravados.`;
  if (name === 'replace_in_file') return `${result.replacements} substituição(ões) aplicada(s).`;
  return 'Ferramenta concluída.';
}

function toolCallSignature(name, args) {
  return `${name}:${JSON.stringify(args, Object.keys(args || {}).sort())}`;
}

async function recoverFromToolLoop({ runId, baseUrl, token, conversation, controller, traceId, model, reason }) {
  sendChatEvent({ runId, type: 'synthesizing', message: 'Stop-loss acionado: consolidando o resultado sem novas ferramentas...' });
  conversation.push({ role: 'system', content: `STOP-LOSS: ${reason} Não execute mais ferramentas. Entregue agora uma síntese objetiva do que foi concluído, do que falhou e do próximo passo verificável.` });
  const completion = await requestAgentCompletion(baseUrl, token, conversation, controller.signal, traceId, model, { tools: [] });
  const message = completion.choices?.[0]?.message;
  const content = redactSecrets(message?.content || '');
  if (!content) throw new Error(`Stop-loss: ${reason}. O modelo não retornou síntese final.`);
  sendChatEvent({ runId, type: 'token', content });
  if (completion.usage) sendChatEvent({ runId, type: 'usage', usage: completion.usage });
  sendChatEvent({ runId, type: 'done', traceId });
  writeAudit('warn', 'agent_run_stoploss_recovered', { reason, usage: completion.usage || null }, traceId);
}

async function runAgent(runId, payload) {
  const controller = new AbortController();
  const activeRun = { controller, child: null };
  activeRuns.set(runId, activeRun);
  const traceId = crypto.randomUUID();
  sendChatEvent({ runId, type: 'start', traceId });
  writeAudit('info', 'agent_run_started', { model: payload.model }, traceId);
  try {
    const { baseUrl, token } = readStoredCredentials();
    if (!token && !isTokenOptional(baseUrl)) throw new Error('Configure a chave do gateway antes de conversar.');
    const conversation = [{ role: 'system', content: AGENT_SYSTEM_PROMPT }, ...payload.messages.filter((message) => message && message.role !== 'system')];
    const seenToolCalls = new Map();
    let step = 0;
    while (!controller.signal.aborted) {
      if (step > 0) sendChatEvent({ runId, type: 'synthesizing', message: 'Ferramenta concluída. Solicitando o próximo passo ao modelo...' });
      const completion = await requestAgentCompletion(baseUrl, token, conversation, controller.signal, traceId, payload.model, { tools: payload.mode === 'plan' ? [] : TOOL_DEFINITIONS });
      const message = completion.choices?.[0]?.message;
      if (!message) throw new Error('O modelo não retornou uma mensagem válida.');
      let toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      if (toolCalls.length === 0 && message.content && payload.mode !== 'plan') {
        const extracted = extractToolCallsFromContent(message.content);
        if (extracted.length > 0) {
          toolCalls = extracted;
          message.tool_calls = extracted;
          message.content = null;
        }
      }
      if (toolCalls.length === 0) {
        sendChatEvent({ runId, type: 'synthesizing', message: 'Sintetizando resultado verificado...' });
        sendChatEvent({ runId, type: 'token', content: redactSecrets(message.content || 'Execução concluída sem texto de resposta.') });
        if (completion.usage) sendChatEvent({ runId, type: 'usage', usage: completion.usage });
        sendChatEvent({ runId, type: 'done', traceId });
        writeAudit('info', 'agent_run_completed', { steps: step, usage: completion.usage || null }, traceId);
        return;
      }
      conversation.push({ role: 'assistant', content: message.content || null, tool_calls: toolCalls });
      let stopLossReason = '';
      for (const call of toolCalls) {
        const name = String(call?.function?.name || 'unknown');
        const args = parseToolArguments(call?.function?.arguments);
        const toolId = call.id || crypto.randomUUID();
        sendChatEvent({ runId, type: 'tool_start', toolId, tool: name, description: describeTool(name, args) });
        const startedAt = Date.now();
        let result;
        try {
          const signature = toolCallSignature(name, args);
          const occurrences = (seenToolCalls.get(signature) || 0) + 1;
          seenToolCalls.set(signature, occurrences);
          if (occurrences >= MAX_SAME_TOOL_CALLS) {
            stopLossReason = `repetição de ${name} com os mesmos argumentos (${occurrences} vezes)`;
            result = { ok: false, error: `Stop-loss: ${stopLossReason}.` };
          } else result = await executeTool(name, args, activeRun);
          const toolOk = result.ok !== false;
          sendChatEvent({ runId, type: 'tool_done', toolId, tool: name, ok: toolOk, summary: toolOk ? summarizeTool(name, result) : result.error, durationMs: Date.now() - startedAt });
          writeAudit(toolOk ? 'info' : 'warn', 'tool_completed', { tool: name, ok: toolOk, durationMs: Date.now() - startedAt }, traceId);
        } catch (error) {
          result = { ok: false, error: safeErrorMessage(error) };
          sendChatEvent({ runId, type: 'tool_done', toolId, tool: name, ok: false, summary: result.error, durationMs: Date.now() - startedAt });
          writeAudit('warn', 'tool_failed', { tool: name, error: result.error }, traceId);
        }
        conversation.push({ role: 'tool', tool_call_id: toolId, name, content: modelToolContent(result) });
      }
      if (stopLossReason) {
        await recoverFromToolLoop({ runId, baseUrl, token, conversation, controller, traceId, model: payload.model, reason: stopLossReason });
        return;
      }
      step += 1;
    }
  } catch (error) {
    if (error?.name === 'AbortError') sendChatEvent({ runId, type: 'cancelled', traceId });
    else sendChatEvent({ runId, type: 'error', message: safeErrorMessage(error), traceId });
    writeAudit('error', 'agent_run_failed', { error: safeErrorMessage(error) }, traceId);
  } finally { activeRuns.delete(runId); }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320, height: 860, minWidth: 980, minHeight: 640, backgroundColor: '#09090b', title: 'SENSIX Agentic Desktop',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true },
  });
  mainWindow.setMenu(null);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('settings:get', () => publicSettings());
ipcMain.handle('settings:save', (_event, settings) => {
  const baseUrl = normalizeBaseUrl(settings?.baseUrl);
  const token = String(settings?.token || '').trim();
  if (!token && !isTokenOptional(baseUrl)) throw new Error('Informe uma chave de API válida para este endpoint.');
  writeStoredCredentials(baseUrl, token);
  return publicSettings();
});
ipcMain.handle('settings:clear', () => { try { fs.rmSync(credentialsPath(), { force: true }); } catch {} return publicSettings(); });
ipcMain.handle('folder:choose', async () => { const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? null : result.filePaths[0]; });
ipcMain.handle('sessions:load', () => { try { const file = sessionsPath(); if (!fs.existsSync(file)) return []; const parsed = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(parsed) ? parsed : []; } catch { return []; } });
ipcMain.handle('sessions:save', (_event, sessions) => { if (!Array.isArray(sessions)) throw new Error('Histórico inválido.'); const file = sessionsPath(); const temporary = `${file}.${crypto.randomUUID()}.tmp`; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(temporary, JSON.stringify(sessions.slice(0, 30)), { encoding: 'utf8', mode: 0o600 }); fs.renameSync(temporary, file); return { ok: true }; });
ipcMain.handle('models:list', () => fetchModels());
ipcMain.handle('chat:send', (_event, payload) => {
  const model = String(payload?.model || '').trim();
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  if (!model || messages.length === 0) throw new Error('Modelo e mensagens são obrigatórios.');
  const runId = crypto.randomUUID();
  setTimeout(() => runAgent(runId, { ...payload, model, messages }), 0);
  return { runId };
});
ipcMain.handle('chat:cancel', (_event, runId) => {
  const activeRun = activeRuns.get(runId);
  if (activeRun) { activeRun.controller.abort(); activeRun.child?.kill(); }
  return { ok: Boolean(activeRun) };
});
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window:close', () => mainWindow?.close());

process.on('uncaughtException', (error) => writeAudit('error', 'uncaught_exception', { error: safeErrorMessage(error) }));
process.on('unhandledRejection', (error) => writeAudit('error', 'unhandled_rejection', { error: safeErrorMessage(error) }));
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
