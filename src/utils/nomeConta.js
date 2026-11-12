/**
 * Nome de exibição da conta.
 *
 * O nickname vem do marketplace (Mercado Livre) e é a chave externa da conta.
 * A razão social mudou para Dose Verde, mas o nickname do ML continua MOGIVITTA.
 * Este alias é SÓ de tela: não altera `account_id`, nickname salvo no backend,
 * OAuth, filtros enviados à API nem qualquer vínculo da conta.
 */
const APELIDOS = {
  mogivitta: "Dose Verde",
};

export function nomeConta(nickname) {
  const bruto = String(nickname ?? "").trim();
  if (!bruto) return "";
  return APELIDOS[bruto.toLowerCase()] || bruto;
}

export default nomeConta;
