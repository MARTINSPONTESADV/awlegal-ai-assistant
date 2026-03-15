import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para o projeto AW Legal AI Assistant
 * Porta do servidor: 8080 (definida em vite.config.ts)
 */
export default defineConfig({
  // Pasta onde ficam os arquivos de teste
  testDir: './tests',

  // Tempo máximo por teste (60 segundos)
  timeout: 60_000,

  // Tempo máximo para assertions como expect()
  expect: { timeout: 10_000 },

  // Não rodar testes em paralelo (evita conflitos de estado)
  fullyParallel: false,

  // Parar após 3 falhas seguidas
  maxFailures: 3,

  // Não repetir testes automaticamente
  retries: 0,

  // 1 worker = sequencial (bom para testes que dependem de login)
  workers: 1,

  // Relatório HTML gerado em playwright-report/
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['line'], // log resumido no terminal
  ],

  // Configurações globais aplicadas a todos os testes
  use: {
    // URL base do servidor local
    baseURL: 'http://localhost:8080',

    // Screenshot apenas quando o teste falha
    screenshot: 'only-on-failure',

    // Vídeo apenas quando o teste falha
    video: 'retain-on-failure',

    // Trace (gravação detalhada) ao retentar testes
    trace: 'on-first-retry',

    // Tempo máximo para cada ação (click, fill, etc.)
    actionTimeout: 15_000,

    // Tempo máximo para navegação entre páginas
    navigationTimeout: 30_000,
  },

  // Projetos (navegadores)
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Viewport padrão desktop
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Inicia o servidor de desenvolvimento automaticamente antes dos testes
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,   // se já estiver rodando, reutiliza
    timeout: 60_000,             // aguarda até 60s para o servidor iniciar
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Pasta para artefatos (screenshots, vídeos, traces)
  outputDir: 'tests/screenshots',
});
