/**
 * directives-rag.cjs — In-Memory RAG & Compressed Directives Engine for SENSIX Desktop
 *
 * Provides:
 *  1. Zero-latency in-memory cache with fs.statSync mtime validation.
 *  2. Semantic chunking of AGENTS.md / SENSIX.md / CLAUDE.md.
 *  3. Compressed canonical core invariants (always active, ~250 tokens).
 *  4. Intent-based dynamic lexical RAG retrieval (injects only task-relevant rules).
 *  5. Session priming state (eliminates repetitive "Diretrizes carregadas..." on every prompt).
 */

const fs = require('fs');
const path = require('path');

const DOMAIN_KEYWORDS = {
  git: ['git', 'commit', 'push', 'branch', 'merge', 'pull', 'pr', 'identity', 'email', 'autor', 'repositório', 'clone', 'rebase', 'tag', 'github'],
  deploy: ['deploy', 'vercel', 'vps', 'cloudflare', 'dns', 'docker', 'traefik', 'servidor', 'compose', 'hosting', 'ssl', 'cname', 'tailscale'],
  ui: ['ui', 'ux', 'ícone', 'icone', 'icon', 'svg', 'emoji', 'modal', 'toast', 'css', 'design', 'layout', 'shimmer', 'skeleton', 'dialog', 'alert', 'estética', 'obsidian', 'zinc'],
  database: ['banco', 'database', 'sql', 'sqlite', 'postgres', 'dump', 'backup', 'tabela', 'schema', 'wal', 'migração', 'persistência'],
  testing: ['teste', 'test', 'teardown', 'pollution', 'limpeza', 'e2e', 'unit', 'mock', 'qa', 'validação', 'empírica', 'smoke', 'falsos'],
  telemetry: ['telemetria', 'telemetry', 'rfc7807', 'log', 'logs', 'erro', 'error', 'trace', 'observabilidade', 'daily_log', 'timeline'],
  terminal: ['powershell', 'terminal', 'shell', 'stdin', 'lock', 'background', 'comando', 'cmd', 'exec', 'task'],
  meta: ['meta', 'facebook', 'graph', 'bm', 'ads', 'campanha', 'anúncio', 'adset', 'token', 'oauth', 'capi'],
  monorepo: ['monorepo', 'packages', 'topologia', 'módulo', 'subpacote', 'arquitetura', 'subprojeto'],
  skills: ['skill', 'plugin', 'hermes', 'protocolo', 'skills hub', 'desktop plugin'],
};

const STOP_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
  'com', 'sem', 'sob', 'sobre', 'que', 'se', 'e', 'ou', 'mas', 'como', 'mais',
  'ele', 'ela', 'eles', 'elas', 'isso', 'isto', 'aquilo', 'este', 'esta', 'esse',
  'você', 'voce', 'eu', 'nós', 'me', 'te', 'lhe', 'nos', 'qual', 'quando', 'onde',
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'in', 'for', 'of', 'por favor', 'favor'
]);

class WorkspaceDirectivesRAG {
  constructor() {
    this.cache = new Map(); // fullPath -> entry
    this.primedSessions = new Map(); // sessionId -> { filePath, mtimeMs }
    this.stats = { totalRequests: 0, cacheHits: 0, cacheMisses: 0, lastIndexedAt: null };
  }

  tokenize(text = '') {
    return String(text)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  isGenericPrompt(text = '') {
    const clean = String(text).trim().toLowerCase();
    return (
      clean.length === 0 ||
      /^(?:continue|continuar|prossiga|prosseguir|ok|certo|entendido|avancar|avançar|proximo|próximo|sim|nao|não|go|next|s|y)$/i.test(clean) ||
      (clean.length < 20 && /^(?:pode continuar|vamos continuar|continuando|vá em frente|manda bala|prossiga com o plano|execute)$/i.test(clean))
    );
  }

  parseSections(rawMarkdown = '') {
    const sections = [];
    const lines = rawMarkdown.split(/\r?\n/);
    let current = { title: 'Intro', lines: [] };

    for (const line of lines) {
      if (/^#{1,3}\s+/.test(line)) {
        if (current.lines.length > 0) {
          sections.push({
            title: current.title,
            content: current.lines.join('\n').trim(),
          });
        }
        current = {
          title: line.replace(/^#{1,3}\s+/, '').trim(),
          lines: [],
        };
      } else {
        current.lines.push(line);
      }
    }
    if (current.lines.length > 0) {
      sections.push({
        title: current.title,
        content: current.lines.join('\n').trim(),
      });
    }

    return sections.filter((s) => s.content.length > 20);
  }

  buildChunks(sections) {
    return sections.map((s, idx) => {
      const cleanTitle = s.title.replace(/[^\w\s-]/g, '').trim();
      const tokens = this.tokenize(`${s.title} ${s.content.slice(0, 300)}`);

      const tags = [];
      for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (keywords.some((k) => s.title.toLowerCase().includes(k) || tokens.includes(k))) {
          tags.push(domain);
        }
      }

      const compressedContent = s.content
        .split('\n')
        .map((l) => l.trimEnd())
        .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
        .slice(0, 25)
        .join('\n');

      return {
        id: `chunk_${idx}`,
        title: s.title,
        cleanTitle,
        tags,
        tokens,
        content: compressedContent,
        charCount: compressedContent.length,
      };
    });
  }

  buildCoreRules(rawMarkdown = '', chunks = []) {
    return [
      '• Raiz Canônica: D:\\WORKSPACE (código) | E:\\axion\\... (builds/artefatos/temp/logs pesados).',
      '• Proibição de Builds Locais: Não rodar builds locais pesados; usar CI/CD remoto com verificação factual.',
      '• Identidade Git: user.name="AXION Enterprise" | user.email="axionenterprise777@gmail.com". Mensagens semânticas: [agente][módulo] tipo: descrição.',
      '• Zero Test Pollution: Teardown e exclusão imediata obrigatória de dados/pedidos/usuários de teste criados.',
      '• Matriz de Deploy: Vercel reservada a frontends estáticos/SPAs; VPS para backends, APIs, Docker e serviços com estado.',
      '• UI/UX & Ícones: Proibição total de emojis como ícones em UI (usar SVGs Lucide/Heroicons). Estética Big Tech (Obsidian/Zinc) sem clichês de IA.',
      '• Observabilidade: Erros estruturados RFC 7807 problem details. Zero falsos declarativos (verificação empírica obrigatória).'
    ].join('\n');
  }

  indexFile(fullPath, candidateName) {
    const stat = fs.statSync(fullPath);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const sections = this.parseSections(raw);
    const chunks = this.buildChunks(sections);
    const coreDirectives = this.buildCoreRules(raw, chunks);

    const entry = {
      filePath: fullPath,
      fileName: candidateName,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      coreDirectives,
      chunks,
      indexedAt: Date.now(),
      stats: {
        totalChars: raw.length,
        totalChunks: chunks.length,
      },
    };

    this.stats.lastIndexedAt = entry.indexedAt;
    return entry;
  }

  resolveDirectiveFile(folderPath = '.') {
    const candidates = ['SENSIX.md', 'CLAUDE.md', '.sensix/RULES.md', 'AGENTS.md'];
    try {
      const resolved = path.resolve(folderPath);
      for (const cand of candidates) {
        const full = path.join(resolved, cand);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          return { fullPath: full, fileName: cand };
        }
      }
      // Canonical fallback
      const canonical = 'D:\\WORKSPACE';
      for (const cand of candidates) {
        const full = path.join(canonical, cand);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          return { fullPath: full, fileName: cand };
        }
      }
    } catch {}
    return null;
  }

  getDirectivesContext(folderPath = '.', userPrompt = '', options = {}) {
    this.stats.totalRequests += 1;
    const resolved = this.resolveDirectiveFile(folderPath);
    if (!resolved) return { found: false };

    const { fullPath, fileName } = resolved;
    let cacheEntry = this.cache.get(fullPath);
    let cacheHit = false;

    try {
      const stat = fs.statSync(fullPath);
      if (cacheEntry && cacheEntry.mtimeMs === stat.mtimeMs && cacheEntry.size === stat.size) {
        cacheHit = true;
        this.stats.cacheHits += 1;
      } else {
        cacheEntry = this.indexFile(fullPath, fileName);
        this.cache.set(fullPath, cacheEntry);
        this.stats.cacheMisses += 1;
      }
    } catch {
      return { found: false };
    }

    // Session-level priming: only notify on the first turn of a session or when directives file is re-indexed
    const sessionId = options.sessionId || 'default';
    const lastSessionInfo = this.primedSessions.get(sessionId);
    const isNewSession = !lastSessionInfo || lastSessionInfo.filePath !== fullPath || lastSessionInfo.mtimeMs !== cacheEntry.mtimeMs;

    if (isNewSession) {
      this.primedSessions.set(sessionId, { filePath: fullPath, mtimeMs: cacheEntry.mtimeMs });
    }

    const shouldNotify = isNewSession;

    // Lexical RAG Retrieval
    let matchedChunks = [];
    if (!this.isGenericPrompt(userPrompt)) {
      const queryTokens = this.tokenize(userPrompt);
      const scored = [];

      for (const chunk of cacheEntry.chunks) {
        let score = 0;
        for (const qt of queryTokens) {
          if (chunk.cleanTitle.toLowerCase().includes(qt)) score += 6;
          if (chunk.tokens.includes(qt)) score += 2;
        }
        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
          if (keywords.some((k) => queryTokens.includes(k)) && chunk.tags.includes(domain)) {
            score += 4;
          }
        }
        if (score >= 4) {
          scored.push({ chunk, score });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      matchedChunks = scored.slice(0, 2).map((s) => s.chunk);
    }

    const parts = [
      `[DIRETRIZES DO PROJETO — RAG COMPRIMIDO (${cacheEntry.fileName})]:`,
      cacheEntry.coreDirectives,
    ];

    if (matchedChunks.length > 0) {
      parts.push('\n[REGRAS ESPECÍFICAS RELEVANTES RECUPERADAS VIA RAG]:');
      for (const mc of matchedChunks) {
        parts.push(`### ${mc.title}\n${mc.content.slice(0, 850)}`);
      }
    }

    const compressedPrompt = parts.join('\n');
    const tokenEstimate = Math.ceil(compressedPrompt.length / 4);

    return {
      found: true,
      file: cacheEntry.fileName,
      fullPath: cacheEntry.filePath,
      cacheHit,
      shouldNotify,
      compressedPrompt,
      matchedRules: matchedChunks.map((c) => c.title),
      tokenEstimate,
      totalChunks: cacheEntry.chunks.length,
      indexedAt: cacheEntry.indexedAt,
    };
  }

  getStats() {
    return {
      ...this.stats,
      cachedFiles: Array.from(this.cache.keys()),
      activeSessions: this.primedSessions.size,
    };
  }

  invalidate(folderPath = null) {
    if (!folderPath) {
      this.cache.clear();
      this.primedSessions.clear();
      return { ok: true, cleared: 'all' };
    }
    const resolved = this.resolveDirectiveFile(folderPath);
    if (resolved) {
      this.cache.delete(resolved.fullPath);
      return { ok: true, cleared: resolved.fullPath };
    }
    return { ok: false };
  }
}

// Global Singleton
const directivesRAG = new WorkspaceDirectivesRAG();

module.exports = {
  directivesRAG,
  getDirectivesContext: (folder, prompt, opts) => directivesRAG.getDirectivesContext(folder, prompt, opts),
  getDirectivesRAGStats: () => directivesRAG.getStats(),
  invalidateDirectivesCache: (folder) => directivesRAG.invalidate(folder),
};
