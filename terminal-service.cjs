const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

const DEFAULT_INLINE_LIMIT = 24 * 1024;
const MAX_READ_CHUNK = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;

function resolvePowerShell() {
  const candidates = [
    process.env.SENSIX_POWERSHELL,
    'pwsh.exe',
    process.env.SystemRoot
      ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
      : null,
    'powershell.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 5000,
    });
    if (!probe.error && probe.status === 0) return candidate;
  }
  throw new Error('PowerShell não encontrado. Instale PowerShell 7 (pwsh) ou configure SENSIX_POWERSHELL.');
}

function resolveWorkingDirectory(cwd) {
  const requested = cwd ? path.resolve(cwd) : process.cwd();
  return fs.existsSync(requested) ? requested : process.cwd();
}

function clampTimeout(value, fallback = DEFAULT_TIMEOUT_MS) {
  return Math.min(Math.max(Number(value) || fallback, 1000), MAX_TIMEOUT_MS);
}

function outputPreview(text, limit = DEFAULT_INLINE_LIMIT) {
  const value = String(text || '');
  if (Buffer.byteLength(value, 'utf8') <= limit) return value;
  const headLimit = Math.floor(limit * 0.55);
  const tailLimit = Math.floor(limit * 0.35);
  const bytes = Buffer.from(value, 'utf8');
  return `${bytes.subarray(0, headLimit).toString('utf8')}\n\n[... saída integral preservada em spillover ...]\n\n${bytes.subarray(Math.max(0, bytes.length - tailLimit)).toString('utf8')}`;
}

class TerminalService {
  constructor({ spilloverRoot, redact = (value) => String(value ?? '') } = {}) {
    this.spilloverRoot = spilloverRoot || path.join(process.env.TEMP || process.cwd(), 'sensix-terminal');
    this.redact = redact;
    this.shell = null;
    this.processes = new Map();
    this.sessions = new Map();
  }

  getShell() {
    if (!this.shell) this.shell = resolvePowerShell();
    return this.shell;
  }

  createRecord(command, cwd, background) {
    const processId = `proc_${crypto.randomUUID()}`;
    let runDir = path.join(this.spilloverRoot, processId);
    try {
      fs.mkdirSync(runDir, { recursive: true });
    } catch {
      runDir = path.join(os.tmpdir(), 'sensix-terminal', processId);
      fs.mkdirSync(runDir, { recursive: true });
    }
    return {
      processId,
      command,
      cwd,
      background,
      status: 'starting',
      code: null,
      signal: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      stdoutPath: path.join(runDir, 'stdout.log'),
      stderrPath: path.join(runDir, 'stderr.log'),
      stdoutBytes: 0,
      stderrBytes: 0,
      child: null,
      pid: null,
      timer: null,
      timedOut: false,
    };
  }

  async execute({ command, cwd, timeoutMs, background = false, env = {}, onStart = null }) {
    const normalized = String(command || '').trim();
    if (!normalized) throw new Error('Comando vazio.');
    const workingDirectory = resolveWorkingDirectory(cwd);
    const record = this.createRecord(normalized, workingDirectory, Boolean(background));
    this.processes.set(record.processId, record);
    const child = spawn(this.getShell(), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', normalized], {
      cwd: workingDirectory,
      env: { ...process.env, ...env, SENSIX_AGENT_RUN: '1' },
      windowsHide: true,
      shell: false,
    });
    record.child = child;
    record.pid = child.pid || null;
    record.status = 'running';
    if (typeof onStart === 'function') onStart({ processId: record.processId, pid: record.pid });

    const stdoutStream = fs.createWriteStream(record.stdoutPath, { flags: 'a', mode: 0o600 });
    const stderrStream = fs.createWriteStream(record.stderrPath, { flags: 'a', mode: 0o600 });
    child.stdout?.on('data', (chunk) => { record.stdoutBytes += chunk.length; stdoutStream.write(chunk); });
    child.stderr?.on('data', (chunk) => { record.stderrBytes += chunk.length; stderrStream.write(chunk); });

    const completion = new Promise((resolve, reject) => {
      let settled = false;
      let exitTimer = null;

      const finish = (code, signal) => {
        if (settled) return;
        settled = true;
        if (record.timer) clearTimeout(record.timer);
        if (exitTimer) clearTimeout(exitTimer);
        record.code = Number.isInteger(code) ? code : (record.timedOut ? -1 : 0);
        record.signal = signal || (record.timedOut ? 'SIGKILL' : null);
        record.status = record.timedOut ? 'timed_out' : (record.code === 0 ? 'completed' : 'failed');
        record.completedAt = new Date().toISOString();
        record.child = null;

        try { child.stdout?.destroy(); } catch {}
        try { child.stderr?.destroy(); } catch {}

        Promise.all([
          new Promise((done) => stdoutStream.end(done)),
          new Promise((done) => stderrStream.end(done)),
        ]).then(() => resolve(this.snapshot(record))).catch(() => resolve(this.snapshot(record)));
      };

      child.once('error', (error) => {
        if (settled) return;
        settled = true;
        if (record.timer) clearTimeout(record.timer);
        if (exitTimer) clearTimeout(exitTimer);
        try { child.stdout?.destroy(); } catch {}
        try { child.stderr?.destroy(); } catch {}
        stdoutStream.end();
        stderrStream.end();
        record.status = 'failed';
        record.completedAt = new Date().toISOString();
        record.child = null;
        reject(error);
      });

      child.once('close', (code, signal) => finish(code, signal));
      child.once('exit', (code, signal) => {
        // If 'close' hasn't fired within 500ms (e.g. child background process inherited stdio pipes), settle cleanly!
        exitTimer = setTimeout(() => {
          finish(code, signal);
        }, 500);
      });

      // Save finish on record for forced external cancellation
      record.forceFinish = finish;
    });

    record.completion = completion;
    record.timer = setTimeout(() => {
      record.timedOut = true;
      this.stop(record.processId).catch(() => {});
      if (typeof record.forceFinish === 'function') {
        record.forceFinish(-1, 'SIGKILL');
      }
    }, clampTimeout(timeoutMs, background ? MAX_TIMEOUT_MS : DEFAULT_TIMEOUT_MS));

    if (background) return this.snapshot(record);
    return completion;
  }

  snapshot(record, { stdoutOffset = 0, stderrOffset = 0 } = {}) {
    const stdout = this.readFrom(record.stdoutPath, stdoutOffset);
    const stderr = this.readFrom(record.stderrPath, stderrOffset);
    return {
      ok: record.status === 'running' || record.status === 'completed',
      processId: record.processId,
      pid: record.pid,
      status: record.status,
      code: record.code,
      signal: record.signal,
      timedOut: record.timedOut,
      background: record.background,
      cwd: record.cwd,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      stdout: outputPreview(this.redact(stdout.content)),
      stderr: outputPreview(this.redact(stderr.content)),
      stdoutOffset: stdout.nextOffset,
      stderrOffset: stderr.nextOffset,
      stdoutBytes: record.stdoutBytes,
      stderrBytes: record.stderrBytes,
      artifacts: {
        stdout: record.stdoutPath,
        stderr: record.stderrPath,
      },
    };
  }

  readFrom(filePath, offset = 0) {
    if (!fs.existsSync(filePath)) return { content: '', nextOffset: Number(offset) || 0 };
    const size = fs.statSync(filePath).size;
    const start = Math.min(Math.max(Number(offset) || 0, 0), size);
    if (start === size) return { content: '', nextOffset: size };
    const length = Math.min(size - start, MAX_READ_CHUNK);
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(filePath, 'r');
    try { fs.readSync(fd, buffer, 0, length, start); } finally { fs.closeSync(fd); }
    return { content: buffer.toString('utf8'), nextOffset: start + length };
  }

  status(processId, offsets = {}) {
    const record = this.processes.get(String(processId || ''));
    if (!record) throw new Error('Processo não encontrado nesta sessão do SENSIX.');
    return this.snapshot(record, offsets);
  }

  async stop(processId) {
    const record = this.processes.get(String(processId || ''));
    if (!record) return { ok: false, processId, status: 'not_found' };
    const pid = record.child?.pid;
    if (pid && Number(pid) > 0) {
      if (process.platform === 'win32') {
        try {
          spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, detached: true });
        } catch {}
      } else {
        try { process.kill(-pid, 'SIGKILL'); } catch { try { record.child?.kill('SIGKILL'); } catch {} }
      }
    }
    try { record.child?.kill('SIGKILL'); } catch {}
    try { record.child?.stdout?.destroy(); } catch {}
    try { record.child?.stderr?.destroy(); } catch {}
    if (typeof record.forceFinish === 'function') {
      record.forceFinish(-1, 'SIGTERM');
    }
    return { ...this.snapshot(record), stopRequested: true };
  }

  async stopAll() {
    await Promise.all([
      ...[...this.sessions.keys()].map((sessionId) => this.stopSession(sessionId).catch(() => null)),
      ...[...this.processes.keys()].map((processId) => this.stop(processId).catch(() => null)),
    ]);
  }

  startSession({ cwd, cols = 120, rows = 30, env = {}, onData = null, onExit = null } = {}) {
    const pty = require('node-pty');
    const sessionId = `term_${crypto.randomUUID()}`;
    const workingDirectory = resolveWorkingDirectory(cwd);
    const terminal = pty.spawn(this.getShell(), ['-NoLogo', '-NoProfile'], {
      name: 'xterm-256color',
      cols: Math.min(Math.max(Number(cols) || 120, 20), 400),
      rows: Math.min(Math.max(Number(rows) || 30, 5), 200),
      cwd: workingDirectory,
      env: { ...process.env, ...env, SENSIX_AGENT_RUN: '1', TERM: 'xterm-256color' },
      useConpty: process.platform === 'win32',
    });
    let resolveExit;
    const exitPromise = new Promise((resolve) => { resolveExit = resolve; });
    const record = { sessionId, terminal, pid: terminal.pid, cwd: workingDirectory, status: 'running', startedAt: new Date().toISOString(), exitPromise };
    this.sessions.set(sessionId, record);
    terminal.onData((data) => {
      if (typeof onData === 'function') onData({ sessionId, type: 'data', data: this.redact(data) });
    });
    terminal.onExit(({ exitCode, signal }) => {
      record.status = 'exited';
      record.exitCode = exitCode;
      record.signal = signal;
      record.completedAt = new Date().toISOString();
      resolveExit({ exitCode, signal });
      if (typeof onExit === 'function') onExit({ sessionId, type: 'exit', exitCode, signal });
      this.sessions.delete(sessionId);
    });
    return { sessionId, pid: terminal.pid, cwd: workingDirectory, status: record.status };
  }

  writeSession(sessionId, data) {
    const record = this.sessions.get(String(sessionId || ''));
    if (!record) throw new Error('Sessão de terminal não encontrada.');
    record.terminal.write(String(data ?? ''));
    return { ok: true, sessionId: record.sessionId, status: record.status };
  }

  resizeSession(sessionId, cols, rows) {
    const record = this.sessions.get(String(sessionId || ''));
    if (!record) return { ok: false, sessionId, status: 'not_found' };
    record.terminal.resize(Math.min(Math.max(Number(cols) || 120, 20), 400), Math.min(Math.max(Number(rows) || 30, 5), 200));
    return { ok: true, sessionId: record.sessionId, status: record.status };
  }

  async stopSession(sessionId) {
    const record = this.sessions.get(String(sessionId || ''));
    if (!record) return { ok: false, sessionId, status: 'not_found' };
    record.status = 'stopping';
    if (process.platform === 'win32') {
      record.terminal.write('\x03exit\r');
    } else {
      record.terminal.kill();
    }
    let exited = await Promise.race([
      record.exitPromise.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 3000)),
    ]);
    if (!exited && process.platform === 'win32' && record.pid) {
      spawnSync('taskkill.exe', ['/PID', String(record.pid), '/T', '/F'], { windowsHide: true, timeout: 10_000 });
      exited = await Promise.race([
        record.exitPromise.then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
      ]);
    }
    return { ok: exited, sessionId: record.sessionId, status: exited ? 'exited' : 'stopping' };
  }
}

module.exports = { TerminalService, clampTimeout, outputPreview, resolvePowerShell, resolveWorkingDirectory };
