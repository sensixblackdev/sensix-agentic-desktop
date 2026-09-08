const crypto = require('node:crypto');

function redactSecrets(value) {
  return String(value ?? '')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:ghp_|gho_|sk-|hf_|vcp_)[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_SECRET]')
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/<think>[\s\S]*?<\/think>/gi, '');
}

function normalizeBaseUrl(value, defaultBaseUrl) {
  const candidate = String(value || defaultBaseUrl).trim().replace(/\/+$/, '');
  const parsed = new URL(candidate);
  const allowedHttp = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(allowedHttp && parsed.protocol === 'http:')) {
    throw new Error('A URL deve usar HTTPS; HTTP é permitido apenas para localhost.');
  }
  return candidate;
}

function validateShellCommand(command) {
  const normalized = String(command || '').trim();
  if (!normalized) throw new Error('Comando vazio.');
  return normalized;
}

function ensureValidToolMessageOrder(messages) {
  if (!Array.isArray(messages)) return [];
  const result = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg) continue;
    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const validCalls = msg.tool_calls.map((call, index) => ({
        ...call,
        id: typeof call?.id === 'string' && call.id.trim()
          ? call.id.trim()
          : `call_${crypto.randomUUID().slice(0, 8)}_${index}`,
      }));
      result.push({ ...msg, tool_calls: validCalls });
      const callIds = new Set(validCalls.map((call) => call.id));
      const answered = new Set();
      let cursor = i + 1;
      while (cursor < messages.length && messages[cursor]?.role === 'tool') {
        const toolMessage = messages[cursor];
        if (callIds.has(toolMessage.tool_call_id) && !answered.has(toolMessage.tool_call_id)) {
          answered.add(toolMessage.tool_call_id);
          result.push(toolMessage);
        } else if (!toolMessage.tool_call_id) {
          const unassigned = validCalls.find((call) => !answered.has(call.id));
          if (unassigned) {
            answered.add(unassigned.id);
            result.push({ ...toolMessage, tool_call_id: unassigned.id });
          }
        }
        cursor += 1;
      }
      for (const call of validCalls) {
        if (!answered.has(call.id)) {
          result.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function?.name || 'tool',
            content: JSON.stringify({ ok: false, error: 'Operação de ferramenta concluída ou interrompida.' }),
          });
        }
      }
      i = cursor - 1;
      continue;
    }
    if (msg.role === 'tool') {
      result.push({ role: 'user', content: `[RESULTADO]: ${msg.content || ''}` });
      continue;
    }
    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length === 0) {
      const cleanMessage = { ...msg };
      delete cleanMessage.tool_calls;
      result.push(cleanMessage);
      continue;
    }
    result.push(msg);
  }
  return result;
}

module.exports = { redactSecrets, normalizeBaseUrl, validateShellCommand, ensureValidToolMessageOrder };
