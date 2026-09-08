const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TerminalService, clampTimeout, outputPreview, resolveWorkingDirectory } = require('../terminal-service.cjs');

test('clampTimeout normaliza limites operacionais', () => {
  assert.equal(clampTimeout(undefined), 60_000);
  assert.equal(clampTimeout(10), 1_000);
  assert.equal(clampTimeout(999_999_999), 86_400_000);
  assert.equal(clampTimeout(12_345), 12_345);
});

test('resolveWorkingDirectory usa o processo quando o workspace configurado não existe', () => {
  assert.equal(resolveWorkingDirectory(path.join(os.tmpdir(), 'sensix-workspace-ausente')), process.cwd());
});

test('outputPreview preserva saída pequena integralmente', () => {
  assert.equal(outputPreview('resultado', 100), 'resultado');
});

test('outputPreview mantém início e fim quando há spillover', () => {
  const output = `INICIO-${'x'.repeat(200)}-FINAL`;
  const preview = outputPreview(output, 100);
  assert.match(preview, /^INICIO-/);
  assert.match(preview, /saída integral preservada em spillover/);
  assert.match(preview, /-FINAL$/);
  assert.ok(preview.length < output.length);
});

test('TerminalService executa PowerShell real e preserva artifacts', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sensix-terminal-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const service = new TerminalService({ spilloverRoot: root });
  const result = await service.execute({
    command: "Write-Output 'sensix-terminal-ok'",
    cwd: root,
    timeoutMs: 10_000,
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.code, 0);
  assert.match(result.stdout, /sensix-terminal-ok/);
  assert.equal(fs.existsSync(result.artifacts.stdout), true);
});

test('TerminalService inicia, consulta e encerra processo background', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sensix-terminal-bg-'));
  const service = new TerminalService({ spilloverRoot: root });
  t.after(async () => {
    await service.stopAll();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const started = await service.execute({
    command: "Write-Output 'started'; Start-Sleep -Seconds 30",
    cwd: root,
    timeoutMs: 60_000,
    background: true,
  });
  assert.equal(started.status, 'running');
  assert.match(started.processId, /^proc_/);
  const running = service.status(started.processId);
  assert.equal(running.status, 'running');
  const stopped = await service.stop(started.processId);
  assert.equal(stopped.stopRequested, true);
});

test('TerminalService mantém sessão PTY e estado entre comandos', () => {
  const check = spawnSync(process.execPath, [path.join(__dirname, 'fixtures', 'pty-session-check.cjs')], {
    encoding: 'utf8',
    timeout: 20_000,
    windowsHide: true,
  });
  assert.equal(check.status, 0, check.stderr || check.error?.message);
  assert.match(check.stdout, /PTY_SESSION_OK/);
});
