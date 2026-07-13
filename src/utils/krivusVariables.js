/**
 * Catálogo de {{variáveis}} dos templates de documento Krivus.
 *
 * O DocWizard monta o formulário a partir da lista `variables` que o backend
 * extrai do template. Este catálogo só melhora a apresentação (label, tipo de
 * input, agrupamento) — variável desconhecida vira input de texto com label
 * prettificado, então criar um template novo não exige mexer aqui.
 *
 * `auto: true`  -> o backend preenche sozinho, o wizard não pergunta.
 * `clientField` -> valor pré-preenchido do Client e salvo de volta nele
 *                  (preenche uma vez, todo documento futuro herda).
 */

export const VARIABLE_CATALOG = {
  // Auto-preenchidas pelo backend — nunca aparecem no form
  cliente: { auto: true, label: 'Nome do cliente' },
  data_inicio: { auto: true, label: 'Início do contrato' },
  mensalidade: { auto: true, label: 'Mensalidade' },
  data_hoje: { auto: true, label: 'Data de hoje' },
  gmv_30d: { auto: true, label: 'GMV (30d)' },
  orders_30d: { auto: true, label: 'Pedidos (30d)' },
  roas: { auto: true, label: 'ROAS' },
  ads_cost_30d: { auto: true, label: 'Gasto Ads (30d)' },
  tiers_tabela: { auto: true, label: 'Faixas de cobrança' },
  lifetime_conquistas: { auto: true, label: 'Conquistas de lifetime' },
  razao_social_contratada: { auto: true, label: 'Razão social (Krivus)' },
  cnpj_contratada: { auto: true, label: 'CNPJ (Krivus)' },
  chave_pix: { auto: true, label: 'Chave PIX (Krivus)' },
  cidade_foro: { auto: true, label: 'Cidade do foro' },
  comarca_foro: { auto: true, label: 'Comarca do foro' },

  // Dados do cliente — pré-preenchidos do Client e persistidos de volta
  razao_social_contratante: { label: 'Razão social do cliente', group: 'cliente', clientField: 'razao_social' },
  cnpj_contratante: { label: 'CNPJ do cliente', group: 'cliente', clientField: 'cnpj', hint: '00.000.000/0000-00' },
  endereco_contratante: { label: 'Endereço do cliente', group: 'cliente', clientField: 'endereco' },

  // Dados específicos do documento — digitados a cada geração
  valor_total: { label: 'Valor total', type: 'currency', group: 'documento' },
  valor_diagnostico_setup: { label: 'Valor do diagnóstico + setup', type: 'currency', group: 'documento' },
  valor_implementacao_adicional: { label: 'Valor de implementação adicional', type: 'currency', group: 'documento' },
  valor_recebido: { label: 'Valor recebido', type: 'currency', group: 'documento' },
  prazo_diagnostico_dias: { label: 'Prazo do diagnóstico (dias)', type: 'number', group: 'documento' },
  prazo_setup_dias: { label: 'Prazo do setup (dias)', type: 'number', group: 'documento' },
  forma_pagamento: { label: 'Forma de pagamento', group: 'documento', hint: 'Ex: PIX à vista / 2x no PIX' },
  descricao_servico: { label: 'Descrição do serviço', type: 'textarea', group: 'documento' },
  resumo_diagnostico: { label: 'Resumo do diagnóstico', type: 'textarea', group: 'documento' },
}

/** Etapa do pipeline -> tipo de template gerado ao entrar nela. */
export const STAGE_TEMPLATE_MAP = {
  proposta_enviada: 'proposta',
  contrato_assinado: 'contrato',
  entregue: 'termo_entrega',
  gestao_continua: 'termo_adesao',
}

/** "valor_total" -> "Valor total" (fallback para variável fora do catálogo). */
export function prettifyVariable(name) {
  const label = name.replace(/_/g, ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Separa as variáveis de um template nos grupos que o wizard renderiza.
 * Retorna { clientFields: [...], docFields: [...], autoVars: [...] } onde cada
 * field é { name, label, type, hint, clientField? }.
 */
export function buildWizardFields(templateVariables) {
  const clientFields = []
  const docFields = []
  const autoVars = []

  for (const name of templateVariables || []) {
    const meta = VARIABLE_CATALOG[name]
    if (meta?.auto) {
      autoVars.push({ name, label: meta.label })
      continue
    }
    const field = {
      name,
      label: meta?.label || prettifyVariable(name),
      type: meta?.type || 'text',
      hint: meta?.hint || '',
      clientField: meta?.clientField || null,
    }
    if (meta?.group === 'cliente') clientFields.push(field)
    else docFields.push(field)
  }

  return { clientFields, docFields, autoVars }
}
