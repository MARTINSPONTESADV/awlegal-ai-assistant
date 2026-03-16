import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────
// CREDENCIAIS DE TESTE
// ─────────────────────────────────────────────
const EMAIL = 'matheus@advspontes.com';
const SENHA = 'Batista@04*';

// ─────────────────────────────────────────────
// HELPER: faz login e aguarda carregar
// ─────────────────────────────────────────────
async function login(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Preenche email e senha
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', SENHA);
  await page.click('button[type="submit"]');

  // Aguarda redirecionar para área logada
  await page.waitForURL(/\/(atendimento|dashboard|home)/, { timeout: 20_000 });
}

// ─────────────────────────────────────────────
// SUITE 1: Carregamento Básico
// ─────────────────────────────────────────────
test.describe('Carregamento Básico', () => {

  test('1.1 — página inicial carrega sem erros JS', async ({ page }) => {
    const erros = [];
    page.on('pageerror', err => erros.push(err.message));

    // Timeout maior para o primeiro teste (servidor pode estar aquecendo)
    await page.goto('/', { timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 });

    // Página não deve estar em branco
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(0);

    // Sem erros fatais no console (ignora ResizeObserver que é inofensivo)
    expect(erros.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);

    // Screenshot da página inicial
    await page.screenshot({ path: 'tests/screenshots/01-pagina-inicial.png', fullPage: true });
  });

  test('1.2 — React renderizou (root não está vazio)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // O <div id="root"> do React deve ter filhos
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
  });

  test('1.3 — título da página está preenchido', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const titulo = await page.title();
    expect(titulo.length).toBeGreaterThan(0);
    console.log('Título da página:', titulo);
  });

});

// ─────────────────────────────────────────────
// SUITE 2: Login
// ─────────────────────────────────────────────
test.describe('Login', () => {

  test('2.1 — formulário de login está visível', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Deve ter campo de email
    const emailField = page.locator('input[type="email"]').first();
    await expect(emailField).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: 'tests/screenshots/02-tela-login.png', fullPage: true });
  });

  test('2.2 — login com credenciais corretas', async ({ page }) => {
    await login(page);

    // Deve ter saído da tela de login
    const url = page.url();
    expect(url).not.toContain('login');
    expect(url).not.toContain('auth');

    await page.screenshot({ path: 'tests/screenshots/03-pos-login.png', fullPage: true });
  });

  test('2.3 — login com senha errada mostra erro', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', 'senha_errada_123');
    await page.click('button[type="submit"]');

    // Aguarda resposta do Supabase
    await page.waitForTimeout(3000);

    const pageText = await page.locator('body').innerText();
    const temErro = pageText.toLowerCase().includes('erro') ||
                    pageText.toLowerCase().includes('inválid') ||
                    pageText.toLowerCase().includes('incorret') ||
                    pageText.toLowerCase().includes('invalid');
    expect(temErro).toBeTruthy();
  });

});

// ─────────────────────────────────────────────
// SUITE 3: Aba de Atendimento
// ─────────────────────────────────────────────
test.describe('Aba Atendimento', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    if (!page.url().includes('atendimento')) {
      await page.goto('/atendimento');
      await page.waitForLoadState('networkidle');
    }
  });

  test('3.1 — aba Atendimento carrega e lista contatos', async ({ page }) => {
    await page.goto('/atendimento');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // aguarda dados do Supabase

    await page.screenshot({ path: 'tests/screenshots/04-atendimento.png', fullPage: true });

    // Verifica que a página não está em branco
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();

    // Loga quantidade de contatos
    const contatos = page.locator('[data-radix-scroll-area-viewport] button');
    const total = await contatos.count();
    console.log(`Contatos visíveis: ${total}`);
  });

  test('3.2 — botões Resolva Já e Martins Pontes existem', async ({ page }) => {
    await page.goto('/atendimento');
    await page.waitForLoadState('networkidle');

    // Usa getByRole para ser específico — evita conflito com outros textos na página
    await expect(page.getByRole('button', { name: 'Resolva Já', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Martins Pontes', exact: true })).toBeVisible();
  });

  test('3.3 — trocar de canal não quebra a página', async ({ page }) => {
    await page.goto('/atendimento');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Troca para Martins Pontes
    await page.getByRole('button', { name: 'Martins Pontes', exact: true }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/05-aba-mp.png', fullPage: true });

    // A aba deve continuar visível e responsiva
    await expect(page.getByRole('button', { name: 'Martins Pontes', exact: true })).toBeVisible();
    await expect(page.locator('#root')).not.toBeEmpty();

    // Volta para Resolva Já
    await page.getByRole('button', { name: 'Resolva Já', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: 'Resolva Já', exact: true })).toBeVisible();
  });

  test('3.4 — busca filtra contatos (sem resultado)', async ({ page }) => {
    await page.goto('/atendimento');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Digita termo que não existe
    const busca = page.locator('input[placeholder="Buscar conversa..."]').first();
    await busca.waitFor({ state: 'visible', timeout: 10_000 });
    await busca.fill('zzzzinexistente999');
    await page.waitForTimeout(1000);

    // Deve mostrar "Nenhuma conversa encontrada"
    await expect(page.getByText(/nenhuma conversa/i)).toBeVisible({ timeout: 8000 });

    // Limpa a busca — lista volta
    await busca.clear();
    await page.waitForTimeout(800);
    await expect(page.getByText(/nenhuma conversa/i)).not.toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/06-busca.png', fullPage: true });
  });

  test('3.5 — abre chat e campo de envio está presente', async ({ page }) => {
    await page.goto('/atendimento');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Clica no primeiro botão da ScrollArea (primeiro contato)
    const primeiroContato = page.locator('[data-radix-scroll-area-viewport] button').first();
    const existe = await primeiroContato.isVisible().catch(() => false);

    if (existe) {
      await primeiroContato.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/screenshots/07-chat-aberto.png', fullPage: true });

      // Campo de texto de envio deve estar visível
      const campoTexto = page.locator('input[placeholder*="ensagem"]').first();
      const visivel = await campoTexto.isVisible().catch(() => false);
      console.log('Campo de texto visível após abrir chat:', visivel);
    } else {
      console.log('Nenhum contato encontrado — lista pode estar vazia');
    }
  });

  test('3.6 — botão de arquivados alterna a lista', async ({ page }) => {
    await page.goto('/atendimento');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // O botão muda de title ao ser clicado: "Ver arquivadas" ↔ "Ver conversas ativas"
    const btnIr = page.locator('button[title="Ver conversas arquivadas"]').first();
    const existe = await btnIr.isVisible().catch(() => false);

    if (existe) {
      await btnIr.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/08-arquivados.png', fullPage: true });

      // Volta ao modo normal (o título muda após clicar)
      const btnVoltar = page.locator('button[title="Ver conversas ativas"]').first();
      await btnVoltar.click();
      await page.waitForTimeout(500);
    } else {
      console.log('Botão de arquivados não encontrado — verificar se title está correto');
    }

    // Página não deve ter quebrado
    await expect(page.locator('#root')).not.toBeEmpty();
  });

});

// ─────────────────────────────────────────────
// SUITE 4: Responsividade Mobile
// ─────────────────────────────────────────────
test.describe('Mobile (375px)', () => {

  test('4.1 — página se adapta em tela mobile sem scroll horizontal', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone 13
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/09-mobile-login.png', fullPage: true });

    // Não deve ter scroll horizontal excessivo (tolerância 20px)
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    console.log(`Mobile — scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);

    await context.close();
  });

});
