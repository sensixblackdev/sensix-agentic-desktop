const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { TerminalService } = require('../../terminal-service.cjs');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sensix-terminal-pty-'));
  const service = new TerminalService({ spilloverRoot: root });
  const chunks = [];
  const session = service.startSession({ cwd: root, onData: ({ data }) => chunks.push(data) });
  service.writeSession(session.sessionId, "$sensixPtyState = 'persistent-ok'\r");
  service.writeSession(session.sessionId, 'Write-Output $sensixPtyState\r');
  const deadline = Date.now() + 10_000;
  while (!chunks.join('').includes('persistent-ok') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.match(chunks.join(''), /persistent-ok/);
  assert.equal(service.resizeSession(session.sessionId, 100, 24).ok, true);
  assert.equal(service.writeSession(session.sessionId, '').ok, true);
  const stopped = await service.stopSession(session.sessionId);
  assert.equal(stopped.ok, true);
  fs.rmSync(root, { recursive: true, force: true });
  process.stdout.write('PTY_SESSION_OK\n', () => process.exit(0));
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`, () => process.exit(1));
});
