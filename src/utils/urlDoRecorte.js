// O estado do recorte e da visão que mora na URL (ticket FINT-11).
//
// Por que existe: o dono precisa **mandar o link** da visão que está vendo e dar `F5` sem perder o
// recorte. Sem isto, cada aba guardava empresa, competência, ordem e busca num `ref` local e o link
// abria sempre no padrão.
//
// As funções são puras de propósito: o runner de teste do frontend roda em ambiente `node`, então a
// regra (o que vai para a URL, o que sai dela e o que é descartado) é testável sem montar componente.
//
// Duas famílias de chave, e a diferença importa:
// - **recorte** (`empresa`, `de`, `ate`) — o contexto da leitura. Ele **atravessa as abas**: trocar de
//   aba não pode perder a empresa escolhida;
// - **visão** (`ordenar`, `dir`, `busca`) — o que é específico daquela tabela. Não faz sentido carregar
//   a coluna ordenada de uma aba para outra, então a troca de aba descarta.

export const CHAVES_RECORTE = ['empresa', 'de', 'ate']
export const CHAVES_VISAO = ['ordenar', 'dir', 'busca']

function texto(valor) {
  return valor === null || valor === undefined ? '' : String(valor)
}

/** O que a URL diz, já normalizado. `empresa` vazia vira `null` (o `v-model` do seletor espera isso). */
export function lerEstado(query = {}) {
  return {
    empresa: texto(query.empresa) || null,
    de: texto(query.de),
    ate: texto(query.ate),
    ordenar: texto(query.ordenar),
    dir: texto(query.dir),
    busca: texto(query.busca),
  }
}

/**
 * Aplica um patch à query **preservando o que não foi tocado** — inclusive parâmetros de outras
 * frentes. Valor vazio (ou só espaço) **sai** da URL: `?busca=` sujaria o link sem dizer nada.
 */
export function aplicarPatch(query = {}, patch = {}) {
  const proximo = { ...query }
  Object.entries(patch).forEach(([chave, valor]) => {
    const limpo = typeof valor === 'string' ? valor.trim() : valor
    if (limpo === '' || limpo === null || limpo === undefined) delete proximo[chave]
    else proximo[chave] = limpo
  })
  return proximo
}

/** Só o recorte de uma query — é o que a troca de aba preserva. */
export function somenteRecorte(query = {}) {
  return CHAVES_RECORTE.reduce((novo, chave) => {
    if (query[chave]) novo[chave] = query[chave]
    return novo
  }, {})
}
