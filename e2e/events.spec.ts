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
  const periodoInfo = await page.getByText('Período selecionado:', { exact: false }).innerText();
  expect(periodoInfo).toContain('dia(s).');
  const daysMatch = periodoInfo.match(/Período selecionado:\s*(\d+)/);
  const baseDailyMatch = periodoInfo.match(/Base diária estimada:\s*([\d\.]+)/);
  const days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
  const baseDaily = baseDailyMatch ? parseInt(baseDailyMatch[1].replace(/\./g, ''), 10) : 0;

  // Cálculos esperados
  const baseEventRides = Math.round(baseDaily * days);
  const totalEventRides = Math.round(baseEventRides * (1 + 40 / 100));

  // Validar corridas estimadas no período
  await expect(page.getByTestId('event-total-rides')).toBeVisible();
  const totalRidesText = await page.getByTestId('event-total-rides').innerText();
  const totalRidesDisplayed = parseInt(totalRidesText.replace(/\D/g, ''), 10);
  expect(totalRidesDisplayed).toBe(totalEventRides);

  // Validar tarifa média com dinâmica
  const brlToNumber = (s: string) => {
    const cleaned = s.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(/,(\d{2})$/, '.$1');
    return parseFloat(cleaned || '0');
  };
  await expect(page.getByTestId('event-avg-fare-base')).toBeVisible();
  const baseFareText = await page.getByTestId('event-avg-fare-base').innerText();
  const baseFare = brlToNumber(baseFareText);
  const avgFareAdjCalc = baseFare * (1 + 25 / 100);
  await expect(page.getByTestId('event-avg-fare-adj')).toBeVisible();
  const avgFareAdjText = await page.getByTestId('event-avg-fare-adj').innerText();
  const avgFareAdjDisplayed = brlToNumber(avgFareAdjText);
  expect(Math.abs(avgFareAdjDisplayed - avgFareAdjCalc)).toBeLessThan(1);

  // Validar GMV = totalEventRides * avgFareAdj
  await expect(page.getByTestId('event-gmv')).toBeVisible();
  const gmvText = await page.getByTestId('event-gmv').innerText();
  const gmvDisplayed = brlToNumber(gmvText);
  const gmvCalc = totalEventRides * avgFareAdjCalc;
  expect(Math.abs(gmvDisplayed - gmvCalc)).toBeLessThan(1); // tolerância por arredondamento

  // Verificar que o gráfico e o label do pico aparecem
  await expect(page.getByText('Pico (Dia', { exact: false })).toBeVisible();

  // Cobertura deve aumentar ao aumentar drivers necessários
  const coverageText1 = await page.getByTestId('event-coverage').innerText();
  const coverage1 = parseFloat(coverageText1.replace(/[^\d,\.]/g, '').replace(',', '.'));
  await numberInputs.nth(2).fill('200'); // aumentar drivers
  const coverageText2 = await page.getByTestId('event-coverage').innerText();
  const coverage2 = parseFloat(coverageText2.replace(/[^\d,\.]/g, '').replace(',', '.'));
  expect(coverage2 === coverage1 || coverage2 > coverage1).toBeTruthy();

  // Disparar exportação Excel e verificar download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar Excel (XLSX)' }).click(),
  ]);
  const suggested = download.suggestedFilename();
  expect(suggested.toLowerCase()).toContain('.xlsx');

  // Opcional: não salvar arquivo, apenas confirmar que iniciou download
});
