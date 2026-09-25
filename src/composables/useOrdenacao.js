// Ordenação da tabela minimalista (ticket FINT-2).
//
// Por que existe: o clique no cabeçalho cicla a ordem e o **tipo** da coluna decide a
// comparação — isso é regra, não desenho de template. As funções são **puras de propósito**:
// o runner de teste do frontend roda em ambiente `node`, sem DOM (mesmo motivo de
// `utils/seletores.js`), então o que é regra fica testável fora do componente.

export const ORDEM_ASC = 'asc'
export const ORDEM_DESC = 'desc'
export const ORDEM_NENHUMA = ''

// `numeric: true` faz "10" vir depois de "9" também no texto (ex.: código de conta).
const COLADOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

/** Estado inicial: sem ordenação — a ordem entregue pelo backend tem significado. */
export function ordenacaoInicial() {
  return { chave: ORDEM_NENHUMA, direcao: ORDEM_NENHUMA }
}

/** `null`, `undefined` e string vazia são "sem valor" — ausência não é zero nem "menor que tudo". */
function semValor(valor) {
  return valor === null || valor === undefined || valor === ''
}

/**
 * Número a partir do valor cru. O backend manda decimal como **string** (`"1234.56"`; a tela
 * formata depois), e uma tela pode reenviar o valor já formatado (`"1.234,56"`) — os dois
 * precisam ordenar como número, não como texto.
 */
export function paraNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (semValor(valor)) return null
  const texto = String(valor).trim()
  const limpo = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto
  const numero = Number(limpo)
  return Number.isFinite(numero) ? numero : null
}

/** Instante a partir de `Date`, `AAAA-MM-DD`, `AAAA-MM` ou ISO; inválido → `null`. */
export function paraData(valor) {
  if (semValor(valor)) return null
  const data = valor instanceof Date ? valor : new Date(String(valor))
  const instante = data.getTime()
  return Number.isNaN(instante) ? null : instante
}

/** O valor usado para ordenar; aceita caminho com ponto (`conta.codigo`). */
export function valorDaChave(linha, chave) {
  if (!chave) return undefined
  return String(chave)
    .split('.')
    .reduce((atual, parte) => (atual == null ? atual : atual[parte]), linha)
}

/**
 * Chave comparável do valor, já pelo tipo da coluna. Devolve `null` para "sem valor" ou
 * para valor que não se converte — e o comparador manda esses para o fim.
 */
function chaveComparavel(valor, tipo) {
  if (semValor(valor)) return null
  if (tipo === 'numero' || tipo === 'moeda') return paraNumero(valor)
  if (tipo === 'data') return paraData(valor)
  return String(valor)
}

/**
 * Ciclo do cabeçalho: primeira vez `asc`, depois `desc`, depois **volta à ordem de origem**.
 * Clicar em outra coluna começa em `asc` (uma coluna por vez — a lógica é simples de propósito).
 */
export function proximaOrdenacao(ordenacao, chave) {
  const atual = ordenacao || ordenacaoInicial()
  if (!chave) return ordenacaoInicial()
  if (atual.chave !== chave) return { chave, direcao: ORDEM_ASC }
  if (atual.direcao === ORDEM_ASC) return { chave, direcao: ORDEM_DESC }
  return ordenacaoInicial()
}

/** `'ascending' | 'descending' | 'none'` — pronto para o `aria-sort` e para o indicador visual. */
export function estadoDaColuna(ordenacao, chave) {
  const atual = ordenacao || ordenacaoInicial()
  if (!chave || atual.chave !== chave || !atual.direcao) return 'none'
  return atual.direcao === ORDEM_DESC ? 'descending' : 'ascending'
}

/**
 * A lista ordenada, **sem tocar na original**.
 *
 * Regras: o `tipo` da coluna decide a comparação (numérico, data ou texto `pt-BR`); empate
 * preserva a ordem anterior (desempate pelo índice, que não depende do motor); nulos vão para
 * o **fim nos dois sentidos**; sem coluna ou sem direção, a ordem de origem é mantida.
 *
 * `coluna` aceita a string da chave ou o objeto da coluna (`{ chave, tipo }`).
 */
export function ordenarLinhas(linhas, coluna, direcao) {
  const lista = Array.isArray(linhas) ? [...linhas] : []
  const chave = typeof coluna === 'string' ? coluna : coluna?.chave
  const tipo = typeof coluna === 'object' ? coluna?.tipo : undefined
  if (!chave || (direcao !== ORDEM_ASC && direcao !== ORDEM_DESC)) return lista

  const sentido = direcao === ORDEM_DESC ? -1 : 1
  const decorada = lista.map((linha, indice) => ({
    linha,
    indice,
    valor: chaveComparavel(valorDaChave(linha, chave), tipo),
  }))

  decorada.sort((a, b) => {
    if (a.valor === null && b.valor === null) return a.indice - b.indice
    if (a.valor === null) return 1
    if (b.valor === null) return -1
    const comparacao =
      typeof a.valor === 'string'
        ? COLADOR.compare(a.valor, b.valor)
        : a.valor < b.valor
          ? -1
          : a.valor > b.valor
            ? 1
            : 0
    return comparacao === 0 ? a.indice - b.indice : comparacao * sentido
  })

  return decorada.map((item) => item.linha)
}
