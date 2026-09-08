const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('node:path');

test('UI Electron inicia e expõe fluxos essenciais', async () => {
  const executablePath = process.env.SENSIX_PACKAGED_EXE || undefined;
  const electronApp = await electron.launch({
    args: executablePath ? [] : [path.resolve(__dirname, '..')],
    executablePath,
    env: { ...process.env, SENSIX_E2E: '1' },
  });

  try {
    const page = await electronApp.firstWindow();
    await expect(page).toHaveTitle('SENSIX Agentic Desktop');
    await expect(page.getByRole('heading', { name: 'SENSIX Agentic Desktop' })).toBeVisible();
    await expect(page.getByPlaceholder(/Peça uma implementação/)).toBeVisible();

    await page.getByRole('button', { name: 'Abrir paleta de comandos' }).click();
    await expect(page.getByPlaceholder(/Digite um comando/)).toBeVisible();
    await page.getByRole('option', { name: /Executar comando \/help/ }).click();
    await expect(page.getByPlaceholder(/Peça uma implementação/)).toHaveValue('/help');

    await page.getByRole('button', { name: /Segurança & Guardrails/ }).click();
    await expect(page.getByRole('heading', { name: 'Auditoria de Segurança' })).toBeVisible();
    await expect(page.getByText('Sandbox do Renderer')).toBeVisible();
    await expect(page.getByText('Web Security')).toBeVisible();
    await expect(page.getByText('FAIL')).toHaveCount(0);

    await page.getByRole('button', { name: /Terminal Agentic/ }).click();
    await expect(page.getByRole('heading', { name: 'Terminal Agentic ConPTY' })).toBeVisible();
    const terminalInput = page.getByPlaceholder(/Digite um comando PowerShell/);
    await expect(terminalInput).toBeEnabled({ timeout: 20_000 });
    await terminalInput.fill("$sensixE2E = 'sensix-electron-terminal-ok'");
    await terminalInput.press('Enter');
    await terminalInput.fill('Write-Output $sensixE2E');
    await terminalInput.press('Enter');
    await expect(page.locator('.terminal-entry').last().locator('pre')).toContainText('sensix-electron-terminal-ok', { timeout: 20_000 });
  } finally {
    await electronApp.close();
  }
});
