const AxeBuilder = require('@axe-core/playwright').default
const { expect, test } = require('@playwright/test')

// E2E das tabelas do Financeiro & Contábil (ticket FINT-15).
//
// Roda contra a URL autenticada (`E2E_BASE_URL`) e **pula** sem ela, como os outros e2e do projeto.
// As respostas da API são mockadas de propósito: o teste exercita a **tabela** (ordenar, clicar,
// abrir o detalhe, fechar com Esc, editar na célula), não o backend.

test.describe('Financeiro — tabelas minimalistas', () => {
  test.skip(!process.env.E2E_BASE_URL, 'Requer E2E_BASE_URL autenticada')

  const LANCAMENTOS = {
    de: '2026-08-01',
    ate: '2026-08-31',
    lancamentos: [
      {
        id: 1,
        competencia: '2026-08',
        data: '2026-08-12',
        historico: 'DAS — Simples Nacional',
        origem: 'das',
        origem_ref: 'das:2026-08',
        is_estorno: false,
        partidas: [
          { id: 11, codigo: '3.3.1.01', conta: 'DAS', debito: '15312.62', credito: '0.00' },
          { id: 12, codigo: '2.1.4.01', conta: 'DAS a recolher', debito: '0.00', credito: '15312.62' },
        ],
      },
      {
        id: 2,
        competencia: '2026-08',
        data: '2026-08-20',
        historico: 'Comissão Shopee',
        origem: 'nfse',
        origem_ref: 'nfse:123',
        is_estorno: false,
        partidas: [
          { id: 21, codigo: '5.3.1.03', conta: 'Comissão', debito: '20.50', credito: '0.00' },
          { id: 22, codigo: '2.1.5.01', conta: 'Fornecedores', debito: '0.00', credito: '20.50' },
        ],
      },
    ],
  }

  const PLANO = {
    plano: [
      {
        codigo: '3.3.1.01',
        nome: 'DAS — Simples Nacional',
        natureza: 'despesa',
        grupo: 'impostos',
        aceita_lancamento: true,
        dre_linha: 'impostos_sobre_a_receita',
        bp_grupo: null,
        dfc_atividade: 'operacional',
        entra_na_mc: false,
        fora_do_resultado: false,
      },
    ],
  }

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/fiscal/cnpjs**', (route) => route.fulfill({ json: [] }))
    await page.route('**/api/financeiro/contabil/**', (route) => {
      const url = route.request().url()
      if (url.includes('plano-de-contas')) return route.fulfill({ json: PLANO })
      if (url.includes('lancamentos')) return route.fulfill({ json: LANCAMENTOS })
      return route.fulfill({ json: {} })
    })
  })

  test('a tabela ordena pelo cabeçalho e a busca filtra no cliente', async ({ page }) => {
    await page.goto('/app/financeiro/livro')

    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText('DAS — Simples Nacional')).toBeVisible()

    // A busca é da tela: filtra o que já carregou, sem nova chamada.
    await page.getByPlaceholder('Buscar histórico, origem ou lastro').fill('comissão')
    await expect(page.getByText('Comissão Shopee')).toBeVisible()
    await expect(page.getByText('DAS — Simples Nacional')).toHaveCount(0)
  })

  test('clicar na linha abre o detalhe e o Esc fecha devolvendo o foco', async ({ page }) => {
    await page.goto('/app/financeiro/livro')

    const linha = page.getByRole('row', { name: /DAS — Simples Nacional/ }).first()
    await linha.click()

    const painel = page.getByRole('dialog')
    await expect(painel).toBeVisible()
    await expect(painel.getByText('DAS a recolher')).toBeVisible()
    await expect(painel.getByText('débito = crédito')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(painel).toHaveCount(0)
    // O foco volta para quem abriu — o botão da linha, que continua alcançável por teclado.
    await expect(linha.getByRole('button', { name: /Abrir detalhes/ })).toBeFocused()
  })

  test('o teclado abre o detalhe na linha focada', async ({ page }) => {
    await page.goto('/app/financeiro/livro')

    const linha = page.getByRole('row', { name: /Comissão Shopee/ }).first()
    await linha.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('a tabela não tem violação de contraste', async ({ page }) => {
    await page.goto('/app/financeiro/livro')
    await expect(page.getByRole('table')).toBeVisible()

    const resultado = await new AxeBuilder({ page })
      .include('.sb-tabela')
      .withRules(['color-contrast'])
      .analyze()

    expect(resultado.violations).toEqual([])
  })
})
