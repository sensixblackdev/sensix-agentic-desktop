const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let electronApp = null;
let resolvedLogsDir = null;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB rotation

function redactSecrets(value) {
  return String(value ?? '')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:ghp_|sk-|hf_|vcp_|gho_)[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_SECRET]')
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/<think>[\s\S]*?<\/think>/gi, '');
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return redactSecrets(obj);
  if (typeof obj !== 'object') return obj;
  try {
    const str = redactSecrets(JSON.stringify(obj));
    return JSON.parse(str);
  } catch {
    return { note: 'Object could not be sanitized' };
  }
}

function initTelemetry(appInstance) {
  electronApp = appInstance;
  getLogsDir(); // Eager directory initialization
}

function getLogsDir() {
  if (resolvedLogsDir && fs.existsSync(resolvedLogsDir)) {
    return resolvedLogsDir;
  }
  // Try canonical path E:\axion\logs\sensix-desktop first
  try {
    if (fs.existsSync('E:\\')) {
      const canonical = path.join('E:\\axion', 'logs', 'sensix-desktop');
      fs.mkdirSync(canonical, { recursive: true });
      resolvedLogsDir = canonical;
      return resolvedLogsDir;
    }
  } catch {}

  // Fallback to Electron userData/logs
  try {
    const fallback = electronApp
      ? path.join(electronApp.getPath('userData'), 'logs')
      : path.join(process.cwd(), 'logs');
    fs.mkdirSync(fallback, { recursive: true });
    resolvedLogsDir = fallback;
    return resolvedLogsDir;
  } catch {
    resolvedLogsDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(resolvedLogsDir, { recursive: true });
    return resolvedLogsDir;
  }
}

function rotateIfNeeded(filePath) {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > MAX_FILE_SIZE) {
      fs.rmSync(`${filePath}.3`, { force: true });
      if (fs.existsSync(`${filePath}.2`)) fs.renameSync(`${filePath}.2`, `${filePath}.3`);
      if (fs.existsSync(`${filePath}.1`)) fs.renameSync(`${filePath}.1`, `${filePath}.2`);
      fs.renameSync(filePath, `${filePath}.1`);
    }
  } catch {}
}

function appendJsonLine(fileName, data) {
  try {
    const dir = getLogsDir();
    const filePath = path.join(dir, fileName);
    rotateIfNeeded(filePath);
    const line = `${JSON.stringify(data)}\n`;
    fs.appendFileSync(filePath, line, { encoding: 'utf8', mode: 0o600 });
  } catch (err) {
    console.error('[Telemetry] Erro ao gravar log:', err.message);
  }
}

function recordTelemetry(event) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    service: 'sensix-agentic-desktop',
    tenantId: 'local-axion',
    traceId: event.traceId || crypto.randomUUID(),
    runId: event.runId || null,
    level: event.level || 'info',
    type: event.type || 'generic_event',
    model: event.model || null,
    durationMs: typeof event.durationMs === 'number' ? event.durationMs : null,
    data: sanitizeObject(event.data || {}),
    rfc7807: event.rfc7807 ? sanitizeObject(event.rfc7807) : undefined
  };

  appendJsonLine('telemetry.jsonl', entry);
  return entry;
}

function recordModelError({ traceId, model, baseUrl, statusCode, errorMessage, rawResponse, promptSummary, messages, retryAttempted, retrySuccess }) {
  const rfc7807 = {
    type: 'https://sensix.axionenterprise.cloud/errors/model-error',
    title: 'Model Inference Failure',
    status: statusCode || 500,
    detail: redactSecrets(errorMessage || 'Falha na comunicação com o modelo de IA'),
    instance: `/chat/completions?model=${encodeURIComponent(model || 'unknown')}`,
    traceId: traceId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    model: model || 'unknown',
    endpoint: redactSecrets(baseUrl || 'default'),
    statusCode: statusCode || 500,
    promptSummary: sanitizeObject(promptSummary || null),
    retryAttempted: Boolean(retryAttempted),
    retrySuccess: Boolean(retrySuccess),
    rawError: rawResponse ? redactSecrets(String(rawResponse).slice(0, 1500)) : null,
    contextSnippet: messages ? redactSecrets(String(messages).slice(0, 1000)) : null
  };

  // Gravado tanto no arquivo dedicado de erros de modelo quanto no telemetry.jsonl
  appendJsonLine('model-errors.jsonl', rfc7807);

  recordTelemetry({
    level: 'error',
    type: 'model_request_error',
    traceId: rfc7807.traceId,
    model: rfc7807.model,
    data: {
      status: rfc7807.status,
      detail: rfc7807.detail,
      retryAttempted: rfc7807.retryAttempted,
      retrySuccess: rfc7807.retrySuccess,
      promptSummary: rfc7807.promptSummary
    },
    rfc7807
  });

  return rfc7807;
}

function getTelemetryStats() {
  const dir = getLogsDir();
  const telemetryFile = path.join(dir, 'telemetry.jsonl');
  const errorsFile = path.join(dir, 'model-errors.jsonl');

  let totalRequests = 0;
  let modelErrors = 0;
  let totalTokens = 0;
  let totalLatency = 0;
  let latencyCount = 0;

  try {
    if (fs.existsSync(telemetryFile)) {
      const content = fs.readFileSync(telemetryFile, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.type === 'model_request_start') totalRequests++;
          if (item.type === 'model_request_error' || item.level === 'error') modelErrors++;
          if (item.data && typeof item.data.totalTokens === 'number') {
            totalTokens += item.data.totalTokens;
          }
          if (typeof item.durationMs === 'number' && item.durationMs > 0) {
            totalLatency += item.durationMs;
            latencyCount++;
          }
        } catch {}
      }
    }
  } catch {}

  try {
    if (fs.existsSync(errorsFile)) {
      const errContent = fs.readFileSync(errorsFile, 'utf8');
      const errLines = errContent.split('\n').filter(Boolean);
      modelErrors = Math.max(modelErrors, errLines.length);
    }
  } catch {}

  return {
    totalRequests,
    modelErrors,
    totalTokens,
    avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
    logsDir: dir,
    timestamp: new Date().toISOString()
  };
}

function getTelemetryEvents({ filter = 'all', limit = 80 } = {}) {
  const dir = getLogsDir();
  const targetFile = filter === 'errors'
    ? path.join(dir, 'model-errors.jsonl')
    : path.join(dir, 'telemetry.jsonl');

  if (!fs.existsSync(targetFile)) return [];

  try {
    const content = fs.readFileSync(targetFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const parsed = [];

    for (let i = lines.length - 1; i >= 0 && parsed.length < limit; i--) {
      try {
        const item = JSON.parse(lines[i]);
        if (filter === 'errors') {
          parsed.push(item);
        } else if (filter === 'prompts') {
          if (item.type === 'model_request_start' || item.type === 'model_request_success') {
            parsed.push(item);
          }
        } else if (filter === 'tools') {
          if (item.type?.startsWith('tool_')) {
            parsed.push(item);
          }
        } else {
          parsed.push(item);
        }
      } catch {}
    }

    return parsed;
  } catch (err) {
    console.error('[Telemetry] Erro ao ler eventos:', err.message);
    return [];
  }
}

function clearTelemetry() {
  try {
    const dir = getLogsDir();
    const telemetryFile = path.join(dir, 'telemetry.jsonl');
    const errorsFile = path.join(dir, 'model-errors.jsonl');
    if (fs.existsSync(telemetryFile)) fs.writeFileSync(telemetryFile, '', 'utf8');
    if (fs.existsSync(errorsFile)) fs.writeFileSync(errorsFile, '', 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  initTelemetry,
  getLogsDir,
  recordTelemetry,
  recordModelError,
  getTelemetryStats,
  getTelemetryEvents,
  clearTelemetry,
  redactSecrets
};
