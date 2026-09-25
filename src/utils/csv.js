// Exportação da visão para CSV (ticket FINT-12).
//
// A regra que o módulo inteiro segue vale aqui também: **ausência não é zero**. Célula sem valor sai
// como `—` (a mesma marca da tela), nunca como `0` — quem for somar na planilha precisa enxergar que
// falta dado, não um zero que mente.
//
// O `tipo` da coluna decide o formato (`moeda` e `data` saem como na tela); o resto sai como veio do
// backend. É a leitura fiel da visão, não uma segunda régua de formatação.

import { formatarMoeda } from 'src/utils/contabil'
import { formatDate } from 'src/utils/formato'

/** A marca de "não se aplica" — a mesma da tela. */
export const SEM_VALOR = '—'

/** Separador `;`: é o que o Excel em português espera, e vírgula decimal não quebra a coluna. */
export const SEPARADOR = ';'

/** Um valor pronto para a planilha. Ausente é `—`, nunca `0`. */
export function valorParaCsv(valor, tipo = 'texto') {
  if (valor === null || valor === undefined || valor === '') return SEM_VALOR
  if (tipo === 'moeda') return formatarMoeda(valor)
  if (tipo === 'data') return formatDate(valor)
  return String(valor)
}

/** Escapa a célula: aspas dobradas e o campo entre aspas quando tem separador, aspas ou quebra. */
export function celulaCsv(texto) {
  const valor = String(texto ?? '')
  const precisa = valor.includes(SEPARADOR) || /["\n\r]/.test(valor)
  return precisa ? `"${valor.replace(/"/g, '""')}"` : valor
}

/**
 * O CSV de uma tabela: cabeçalho com os rótulos e uma linha por linha exibida.
 *
 * `coluna.valor(linha)` permite exportar algo que não é o campo cru (ex.: o total de uma linha).
 * Sem ele, vale `linha[coluna.chave]`.
 */
export function paraCsv({ colunas = [], linhas = [] } = {}) {
  const cabecalho = colunas.map((coluna) => celulaCsv(coluna.rotulo)).join(SEPARADOR)
  const corpo = (linhas || []).map((linha) =>
    colunas
      .map((coluna) => {
        const bruto =
          typeof coluna.valor === 'function' ? coluna.valor(linha) : linha?.[coluna.chave]
        return celulaCsv(valorParaCsv(bruto, coluna.tipo))
      })
      .join(SEPARADOR),
  )
  return [cabecalho, ...corpo].join('\r\n')
}

/** O BOM faz o Excel abrir o arquivo como UTF-8 — sem ele, acento vira caractere estranho. */
export function comBom(conteudo) {
  return `\ufeff${conteudo}`
}

/** Dispara o download no navegador. Fica aqui para o `Blob` não vazar para dentro do template. */
export function baixarCsv(nome, conteudo) {
  const arquivo = String(nome || 'financeiro').trim() || 'financeiro'
  const blob = new Blob([comBom(conteudo)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = arquivo.endsWith('.csv') ? arquivo : `${arquivo}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
