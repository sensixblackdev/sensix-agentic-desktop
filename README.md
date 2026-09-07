# SENSIX Agentic Desktop

Cliente Electron público para runtimes de GPU compatíveis com OpenAI. Baixe instaladores verificados em [Releases](https://github.com/sensixblackdev/sensix-agentic-desktop/releases).

Cliente Electron independente do AXION para executar o Qwen3-Coder publicado em GPU Vast com ferramentas locais reais.

## Runtime agêntico

- Endpoint padrão: `http://174.78.228.101:40746/v1`.
- Modelo ativo: `qwen3-coder-30b` via vLLM/OpenAI Chat Completions.
- Loop ReAct com até 30 etapas e suporte nativo a `tool_calls` paralelas.
- Terminal PowerShell unificado com execução foreground/background, polling incremental, encerramento da árvore e spillover integral em `E:\axion\temp\sensix-terminal`.
- Ferramentas: listagem, leitura, pesquisa com ripgrep, escrita atômica, substituição em arquivos e PowerShell.
- Workspaces autorizados: `D:\WORKSPACE` e `E:\axion`.
- Terminal privado com acesso total; segredos são redigidos das respostas e da telemetria textual.
- Eventos progressivos: `tool_start`, `tool_done`, `synthesizing`, `token` e `done`.

## Segurança

- A chave nunca fica no código, no renderer, no `localStorage` ou no repositório.
- O processo principal armazena a chave com `safeStorage` do Electron em `app.getPath('userData')`.
- Todas as chamadas ao modelo e ferramentas saem do processo principal; o renderer usa somente IPC com `contextIsolation` e `sandbox` ativos.
- Se o sistema não oferecer armazenamento criptografado, a aplicação recusa persistir a chave e informa o usuário.
- Auditoria estruturada e sanitizada é gravada no diretório `userData` do Electron, com rotação em 5 MB.
- O endpoint padrão usa HTTPS. HTTP é aceito somente para runtimes locais em `localhost` ou `127.0.0.1`.

## Desenvolvimento

Na pasta do projeto:

Use o pipeline remoto do GitHub Actions para instalar dependências, validar e empacotar. A execução local interativa deve ser iniciada somente por um operador humano quando necessária.

A URL padrão aponta para a instância A100. O catálogo é lido de `/models`; o runtime envia definições OpenAI de tools para `/chat/completions`, executa as chamadas localmente e devolve cada resultado ao modelo até a síntese final.

O instalador é gerado apenas no GitHub Actions quando uma tag `v*` é publicada. Cada release anexa o `.exe`, `.blockmap` e `release-manifest.json` com SHA-256; não execute instaladores sem conferir esse manifesto.
