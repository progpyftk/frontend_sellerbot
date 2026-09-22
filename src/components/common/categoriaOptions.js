/**
 * Montagem das opções do seletor de categoria do plano de contas.
 *
 * Fica fora do componente porque é a parte com regra (agrupamento, cabeçalho de grupo e
 * busca sem acento) e assim pode ser testada sem montar o `q-select`. A lista de categorias
 * vem do backend (`GET /api/financeiro/categorias/`) — nada é duplicado aqui.
 */

/** Busca insensível a acento e a caixa: "refeicao" acha "Refeição". */
export function normalizarBusca(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Achata os grupos em opções, marcando `inicioGrupo` na primeira de cada grupo — é o que
 * permite desenhar o cabeçalho do grupo no slot `#option` do Quasar.
 *
 * @param {Array<{nome: string, categorias: Array}>} grupos
 * @param {string} termo texto da busca, já digitado pelo usuário
 */
export function montarOpcoes(grupos, termo = '') {
  const alvo = normalizarBusca(termo);
  const opcoes = [];
  (grupos || []).forEach((grupo) => {
    const itens = (grupo?.categorias || []).filter((categoria) => {
      if (!alvo) return true;
      const texto = `${categoria.rotulo} ${categoria.codigo} ${grupo.nome}`;
      return normalizarBusca(texto).includes(alvo);
    });
    itens.forEach((categoria, indice) => {
      opcoes.push({
        label: categoria.rotulo,
        value: categoria.codigo,
        codigo: categoria.codigo,
        rotulo: categoria.rotulo,
        grupo: grupo.nome,
        inicioGrupo: indice === 0,
        mc: !!categoria.mc,
        foraDoResultado: !!categoria.fora_do_resultado,
        ajuda: categoria.ajuda || '',
      });
    });
  });
  return opcoes;
}
