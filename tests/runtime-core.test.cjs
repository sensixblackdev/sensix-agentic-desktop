const test = require('node:test');
const assert = require('node:assert/strict');
const {
  redactSecrets,
  normalizeBaseUrl,
  validateShellCommand,
  ensureValidToolMessageOrder,
} = require('../runtime-core.cjs');

test('normalizeBaseUrl aceita HTTPS e remove barras finais', () => {
  assert.equal(normalizeBaseUrl('https://api.example.test/v1///', 'https://fallback.test'), 'https://api.example.test/v1');
});

test('normalizeBaseUrl aceita HTTP apenas em loopback', () => {
  assert.equal(normalizeBaseUrl('http://127.0.0.1:8080/v1', 'https://fallback.test'), 'http://127.0.0.1:8080/v1');
  assert.throws(() => normalizeBaseUrl('http://example.test/v1', 'https://fallback.test'), /HTTPS/);
});

test('redactSecrets remove bearer, tokens, chave privada e think', () => {
  const providerToken = ['ghp', '1234567890abcdefghijkl'].join('_');
  const apiToken = ['sk', '1234567890abcdefghij'].join('-');
  const privateKey = [
    ['-----BEGIN TEST', ' PRIVATE KEY-----'].join(''),
    'secret',
    ['-----END TEST', ' PRIVATE KEY-----'].join(''),
  ].join('\n');
  const raw = `Bearer abc.def ${providerToken} ${apiToken} <think>privado</think> ${privateKey}`;
  const result = redactSecrets(raw);
  assert.doesNotMatch(result, /abc\.def|1234567890abcdefghijkl|privado|\nsecret\n/);
  assert.match(result, /\[REDACTED/);
});

test('validateShellCommand aceita diagnóstico seguro e bloqueia operações críticas', () => {
  assert.equal(validateShellCommand('Get-Location'), 'Get-Location');
  for (const command of [
    'Get-Content D:\\WORKSPACE\\SECURE\\VAULT\\service.env',
    'Remove-Item D:\\WORKSPACE\\temp -Recurse',
    'git reset --hard',
    'Get-ChildItem env:',
  ]) {
    assert.throws(() => validateShellCommand(command), /bloqueado/);
  }
});

test('ensureValidToolMessageOrder mantém paridade e injeta resposta ausente', () => {
  const result = ensureValidToolMessageOrder([
    { role: 'user', content: 'execute' },
    { role: 'assistant', content: null, tool_calls: [
      { id: 'call_a', type: 'function', function: { name: 'read_file', arguments: '{}' } },
      { id: 'call_b', type: 'function', function: { name: 'list_files', arguments: '{}' } },
    ] },
    { role: 'tool', tool_call_id: 'call_a', name: 'read_file', content: '{"ok":true}' },
    { role: 'assistant', content: 'fim' },
  ]);
  const toolReplies = result.filter((message) => message.role === 'tool');
  assert.deepEqual(toolReplies.map((message) => message.tool_call_id), ['call_a', 'call_b']);
  assert.match(toolReplies[1].content, /interrompida/);
});

test('ensureValidToolMessageOrder converte tool órfã em mensagem de usuário', () => {
  assert.deepEqual(ensureValidToolMessageOrder([{ role: 'tool', content: 'ok' }]), [
    { role: 'user', content: '[RESULTADO]: ok' },
  ]);
});
