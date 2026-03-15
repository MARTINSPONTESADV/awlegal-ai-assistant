# Testes Automatizados com Playwright

Este projeto usa [Playwright](https://playwright.dev/) para testes end-to-end (E2E) que simulam um usuário real navegando no sistema.

---

## Como rodar os testes

### Pré-requisito
O servidor de desenvolvimento será iniciado automaticamente pelo Playwright antes de cada rodada de testes. Mas você também pode iniciar manualmente:
```bash
npm run dev
```

### Comandos disponíveis

| Comando | Descrição |
|---|---|
| `npm test` | Roda todos os testes em modo headless (sem abrir o browser) |
| `npm run test:headed` | Roda os testes com o browser visível na tela |
| `npm run test:ui` | Abre a interface visual do Playwright (recomendado para desenvolvimento) |
| `npm run test:report` | Abre o relatório HTML do último teste |
| `npm run test:unit` | Roda os testes unitários com Vitest (testes de componentes) |

---

## Ver relatórios

Após rodar `npm test`, um relatório HTML é gerado em `playwright-report/`.

```bash
# Abrir o relatório no browser
npm run test:report
```

Screenshots de falhas ficam em `tests/screenshots/`.

---

## Estrutura de arquivos

```
tests/
├── screenshots/          # Screenshots automáticos (gerados ao rodar testes)
├── exemplo.spec.js       # Testes básicos de carregamento, login e atendimento
└── [seu-teste].spec.js   # Adicione novos arquivos aqui

playwright.config.js      # Configuração principal do Playwright
playwright-report/        # Relatórios HTML (gerado após rodar testes)
```

---

## Como criar novos testes

Crie um arquivo `.spec.js` na pasta `tests/`:

```js
// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Nome do Módulo', () => {

  test('descrição do que está testando', async ({ page }) => {
    // Navega para a página
    await page.goto('/atendimento');

    // Aguarda carregar
    await page.waitForLoadState('networkidle');

    // Clica em um elemento
    await page.click('button:has-text("Martins Pontes")');

    // Verifica que algo está visível
    await expect(page.getByText('Martins Pontes')).toBeVisible();

    // Tira screenshot
    await page.screenshot({ path: 'tests/screenshots/meu-teste.png' });
  });

});
```

---

## Comandos úteis do Playwright

```bash
# Rodar apenas um arquivo específico
npx playwright test tests/exemplo.spec.js

# Rodar apenas um teste específico (por nome)
npx playwright test -g "login com credenciais corretas"

# Rodar em modo debug (pausa em cada passo)
npx playwright test --debug

# Gerar código de teste gravando ações no browser
npx playwright codegen http://localhost:8080

# Ver todos os seletores disponíveis (inspector)
npx playwright inspector
```

---

## Configurações

As configurações estão em `playwright.config.js`:

- **Porta**: 8080 (definida em `vite.config.ts`)
- **Browser**: Chromium (Chrome)
- **Timeout por teste**: 60 segundos
- **Screenshots**: salvos em falhas em `tests/screenshots/`
- **Vídeos**: gravados em falhas

---

## Testes existentes

### `tests/exemplo.spec.js`

| Suite | Teste | O que valida |
|---|---|---|
| Carregamento Básico | 1.1 | Página carrega sem erros JS |
| Carregamento Básico | 1.2 | React renderizou (root não vazio) |
| Carregamento Básico | 1.3 | Título da página preenchido |
| Login | 2.1 | Formulário de login está visível |
| Login | 2.2 | Login com credenciais corretas |
| Login | 2.3 | Senha errada mostra mensagem de erro |
| Atendimento | 3.1 | Aba carrega e lista contatos |
| Atendimento | 3.2 | Botões Resolva Já e Martins Pontes existem |
| Atendimento | 3.3 | Trocar de canal não quebra a página |
| Atendimento | 3.4 | Busca filtra contatos corretamente |
| Atendimento | 3.5 | Botão de arquivados funciona |
| Atendimento | 3.6 | Abrir chat carrega mensagens |
| Mobile | 4.1 | Página se adapta em 375px sem scroll horizontal |
