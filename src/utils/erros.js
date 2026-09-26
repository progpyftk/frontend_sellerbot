// Mensagem legível de um erro de API (ticket FINT-20).
//
// Por que existe: `FinanceiroDespesas`, `FinanceiroLivro` e `FinanceiroMargem` tinham cada um a sua
// `mensagemDeErro`, todas tentando a mesma coisa — tirar o texto humano de um erro do Django REST — e
// todas cobrindo um pedaço diferente do formato. O resultado era o mesmo backend render "detalhe",
// "primeiro campo" ou nada, dependendo da aba. Uma implementação só, com o texto de fallback do dono.

/**
 * Extrai a mensagem de um erro de API.
 *
 * A ordem de preferência segue o que o Django REST costuma devolver: `detail` (erro de regra), o
 * campo que o chamador nomear (`preferidos`, ex.: `['competencia']`) e, por fim, o primeiro campo do
 * objeto — que é como o DRF devolve erro de validação de campo (`{campo: ["mensagem"]}`).
 *
 * @param {unknown} e erro capturado (normalmente do axios)
 * @param {string} [padrao] texto quando não há nada aproveitável no corpo da resposta
 * @param {string[]} [preferidos] campos do corpo a tentar antes do primeiro campo
 * @returns {string} sempre uma string não vazia
 */
export function mensagemDeErro(e, padrao = 'Não foi possível concluir a operação.', preferidos = []) {
  const dados = e?.response?.data
  if (typeof dados === 'string' && dados) return dados
  if (dados?.detail) return dados.detail

  for (const campo of preferidos) {
    const valor = dados?.[campo]
    if (valor) return [].concat(valor).join(' ')
  }

  const primeiro = dados && typeof dados === 'object' ? Object.values(dados)[0] : null
  if (Array.isArray(primeiro) && primeiro.length) return String(primeiro[0])
  if (typeof primeiro === 'string' && primeiro) return primeiro

  return padrao
}
