/**
 * learning-ledger.cjs — Real-Time Self-Learning Memory Ledger for SENSIX Desktop
 *
 * Implements canonical agentic self-learning patterns:
 *  1. Persists operational lessons learned from auto-healed tool and model failures.
 *  2. Injects distilled past lessons into agent prompts to avoid repeating past errors.
 *  3. Storage in E:\axion\logs\sensix-desktop\learning-ledger.json (fallback to userData).
 */

const fs = require('fs');
const path = require('path');

const PRIMARY_DIR = 'E:\\axion\\logs\\sensix-desktop';
const PRIMARY_FILE = path.join(PRIMARY_DIR, 'learning-ledger.json');
const MAX_LESSONS = 50;

class LearningLedger {
  constructor() {
    this.filePath = PRIMARY_FILE;
    this.lessons = [];
    this.stats = { totalRecorded: 0, injections: 0 };
    this.initialized = false;
  }

  init(fallbackDir = null) {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(PRIMARY_DIR)) {
        fs.mkdirSync(PRIMARY_DIR, { recursive: true });
      }
      this.filePath = PRIMARY_FILE;
    } catch {
      if (fallbackDir) {
        this.filePath = path.join(fallbackDir, 'learning-ledger.json');
        try { fs.mkdirSync(fallbackDir, { recursive: true }); } catch {}
      }
    }

    this.loadFromDisk();
    this.seedDefaultLessons();
    this.initialized = true;
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.lessons)) {
          this.lessons = parsed.lessons;
          this.stats = parsed.stats || this.stats;
        }
      }
    } catch {
      this.lessons = [];
    }
  }

  saveToDisk() {
    try {
      const data = {
        updatedAt: new Date().toISOString(),
        stats: this.stats,
        lessons: this.lessons.slice(0, MAX_LESSONS),
      };
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      // Non-fatal if storage temporarily unavailable
    }
  }

  seedDefaultLessons() {
    if (this.lessons.length > 0) return;
    // Canonical baseline lessons to jumpstart intelligence
    const defaults = [
      {
        id: 'lesson-ps-chaining',
        symptom: 'Operador "&&" no PowerShell gera erro de sintaxe The token "&&" is not a valid statement separator',
        rootCause: 'PowerShell antigo ou modo padrão requer ";" para encadeamento sequencial em vez de "&&"',
        fixApplied: 'Substituir "&&" por ";" ou executar comandos em chamadas shell_exec separadas',
        tool: 'shell_exec',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'lesson-json-truncation',
        symptom: 'Argumentos de tool recortados com SyntaxError: Unexpected end of JSON input',
        rootCause: 'Modelo atingiu o limite max_tokens durante a emissão de múltiplos tool_calls',
        fixApplied: 'Aumentar max_tokens para 4096+ e aplicar reparo automático de aspas/chaves não balanceadas',
        tool: 'parseToolArguments',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'lesson-openrouter-tool-404',
        symptom: 'Erro HTTP 404: No endpoints found that support tool use ao usar modelos como Dolphin ou Hermes',
        rootCause: 'OpenRouter rejeita a chamada se o histórico contiver mensagens de role: "tool" mesmo com tools: null',
        fixApplied: 'Sanitizar histórico convertendo role: "tool" para role: "user" em formato texto antes de alternar para ReAct',
        tool: 'requestAgentCompletion',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'lesson-powershell-quotes',
        symptom: 'Comando no shell falha com caminhos contendo espaços ou hífens',
        rootCause: 'Falta de aspas em torno de caminhos com espaços no Windows',
        fixApplied: 'Envolver caminhos sempre com aspas duplas, ex: "& \\"D:\\\\WORKSPACE\\\\meu script.ps1\\""',
        tool: 'shell_exec',
        timestamp: new Date().toISOString(),
      }
    ];

    this.lessons = defaults;
    this.saveToDisk();
  }

  recordLesson({ symptom, rootCause, fixApplied, tool = 'general', model = null }) {
    if (!symptom || !fixApplied) return;
    this.stats.totalRecorded += 1;

    // Check if similar lesson already exists
    const existingIndex = this.lessons.findIndex(
      (l) => l.tool === tool && (l.symptom.includes(symptom.slice(0, 30)) || symptom.includes(l.symptom.slice(0, 30)))
    );

    const entry = {
      id: `lesson-${Date.now()}`,
      symptom: String(symptom).slice(0, 200),
      rootCause: String(rootCause || 'Falha de execução corrigida dinamicamente').slice(0, 200),
      fixApplied: String(fixApplied).slice(0, 200),
      tool,
      model: model || 'any',
      timestamp: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.lessons[existingIndex] = entry;
    } else {
      this.lessons.unshift(entry);
      if (this.lessons.length > MAX_LESSONS) {
        this.lessons = this.lessons.slice(0, MAX_LESSONS);
      }
    }

    this.saveToDisk();
  }

  getRelevantLessons(queryText = '', activeTools = []) {
    this.stats.injections += 1;
    const lowerQuery = String(queryText).toLowerCase();
    return this.lessons.filter((lesson) => {
      if (activeTools.includes(lesson.tool)) return true;
      if (lowerQuery.includes(lesson.tool.toLowerCase())) return true;
      if (lowerQuery.includes('powershell') || lowerQuery.includes('shell') || lowerQuery.includes('terminal')) {
        return lesson.tool === 'shell_exec';
      }
      return false;
    }).slice(0, 3);
  }

  formatLessonsForPrompt(queryText = '') {
    const relevant = this.getRelevantLessons(queryText, ['shell_exec', 'parseToolArguments', 'requestAgentCompletion']);
    if (relevant.length === 0) return '';

    const lines = [
      '[AUTO-LEARNING · LIÇÕES APRENDIDAS DE EXECUÇÕES ANTERIORES]:',
      ...relevant.map((l) => `• Sintoma: ${l.symptom} ➔ Solução Aplicada: ${l.fixApplied}`),
    ];
    return lines.join('\n');
  }

  getStats() {
    return {
      totalLessons: this.lessons.length,
      totalRecorded: this.stats.totalRecorded,
      totalInjections: this.stats.injections,
      filePath: this.filePath,
      lessons: this.lessons.slice(0, 10),
    };
  }

  clear() {
    this.lessons = [];
    this.stats = { totalRecorded: 0, injections: 0 };
    this.seedDefaultLessons();
    this.saveToDisk();
    return { ok: true, count: this.lessons.length };
  }
}

const learningLedger = new LearningLedger();

module.exports = {
  learningLedger,
  initLearningLedger: (fallbackDir) => learningLedger.init(fallbackDir),
  recordLesson: (payload) => learningLedger.recordLesson(payload),
  formatLessonsForPrompt: (query) => learningLedger.formatLessonsForPrompt(query),
  getLearningStats: () => learningLedger.getStats(),
  clearLearningLedger: () => learningLedger.clear(),
};
