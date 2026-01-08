import { test, expect } from '@playwright/test';

// Este teste cobre o fluxo da aba "PROJEÇÕES DE FESTAS/EVENTOS"
// - Navegar até a aba
// - Preencher datas e parâmetros
// - Selecionar distribuição Curva S e ajustar controles
// - Validar feedback do período e presença do gráfico
// - Disparar exportação Excel e verificar início do download

test('Eventos: Curva S, KPIs e exportação Excel', async ({ page, context }) => {
  await page.goto('/');

  // Ir para a aba de eventos
  await page.getByRole('button', { name: 'PROJEÇÕES DE FESTAS/EVENTOS' }).click();
  await expect(page.getByRole('heading', { name: 'Projeções de Festas/Eventos' })).toBeVisible();

  // Preencher datas (5 dias)
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill('2026-06-01');
  await dateInputs.nth(1).fill('2026-06-05');

  // Preencher números: dinâmica, % corridas extra, drivers necessários
  const numberInputs = page.locator('input[type="number"]');
  await numberInputs.nth(0).fill('25'); // Dinâmica %
  await numberInputs.nth(1).fill('40'); // % adicional
  await numberInputs.nth(2).fill('120'); // Drivers necessários

  // Selecionar distribuição Curva S
  const selectDistrib = page.locator('select');
  await selectDistrib.selectOption('curvaS');

  // Ajustar range de intensidade (k) e posição do pico
  const ranges = page.locator('input[type="range"]');
  // Garantir que os ranges apareceram
  await expect(ranges.first()).toBeVisible();
  // Setar valores via dispatch de eventos
  await ranges.nth(0).evaluate((el: HTMLInputElement) => { el.value = '0.9'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await ranges.nth(1).evaluate((el: HTMLInputElement) => { el.value = '0.75'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });

  // Validar período e base diária renderizados
  await expect(page.getByText('Período selecionado:')).toBeVisible();
  await expect(page.getByText('dia(s).', { exact: false })).toBeVisible();

  // Verificar que o gráfico e o label do pico aparecem
  await expect(page.getByText('Pico (Dia', { exact: false })).toBeVisible();

  // Disparar exportação Excel e verificar download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Excel (XLSX)' }).click(),
  ]);
  const suggested = download.suggestedFilename();
  expect(suggested.toLowerCase()).toContain('.xlsx');

  // Opcional: não salvar arquivo, apenas confirmar que iniciou download
});
