<template>
  <!-- Uma coluna da cascata GMV → lucro bruto (CUSTO-14). Sem `resultado`, "—" com o motivo. -->
  <div v-if="!resultado" class="cc cc--vazio">
    <router-link v-if="motivoPedeConfiguracao(motivo)" :to="ROTA_PARAMETROS_MARGEM" class="cc-link" @click.stop>—</router-link>
    <template v-else>—</template>
    <q-tooltip class="bg-grey-9" max-width="280px">
      {{ textoMotivo(motivo) }}<template v-if="motivoPedeConfiguracao(motivo)"> Clique para abrir.</template>
    </q-tooltip>
  </div>

  <div v-else-if="coluna === 'lucro_bruto'" class="cc">
    <div :class="['cc-main cc-strong', valor >= 0 ? 'cc-pos' : 'cc-neg']">{{ moeda(valor) }}</div>
    <div :class="['cc-pill', valor >= 0 ? 'cc-pill--pos' : 'cc-pill--neg']">{{ fmtPct(margemPct(resultado)) }} do GMV</div>
    <div v-if="resultado.custo_incompleto" class="cc-flag">custo incompleto</div>
    <q-tooltip class="bg-grey-9 cc-tip" max-width="320px">
      <div class="cc-tip-title">Lucro bruto = margem de contribuição</div>
      <div v-for="c in COLUNAS_CASCATA" :key="c.chave" :class="['cc-tip-row', c.subtotal ? 'cc-tip-sub' : '']">
        <span>{{ c.sinal < 0 ? '(−) ' : c.subtotal ? '(=) ' : '' }}{{ c.rotulo }}</span>
        <span>{{ moeda(resultado[c.chave]) }}</span>
      </div>
      <div class="cc-tip-foot">
        Rates de {{ formatDiaMes(resultado.snapshot_data) }} · lucro bruto ÷ GMV = {{ fmtPct(margemPct(resultado)) }}
      </div>
    </q-tooltip>
  </div>

  <div v-else-if="coluna === 'receita_liquida'" class="cc">
    <div class="cc-main cc-strong">{{ moeda(valor) }}</div>
    <div class="cc-sub">líquida de impostos</div>
  </div>

  <div v-else class="cc">
    <div :class="['cc-main', valor ? 'cc-ded' : 'cc-zero']">{{ valor ? '−' + moeda(Math.abs(valor)) : moeda(0) }}</div>
    <div class="cc-sub">{{ sub }}</div>
    <div v-if="flag" class="cc-flag">{{ flag }}</div>
    <q-tooltip class="bg-grey-9 cc-tip" max-width="300px">
      <div class="cc-tip-title">{{ titulo }}</div>
      <div v-for="([rot, v], i) in linhas" :key="i" class="cc-tip-row">
        <span>{{ rot }}</span><span>{{ typeof v === 'number' ? moeda(v) : v }}</span>
      </div>
      <div v-if="nota" class="cc-tip-foot">{{ nota }}</div>
    </q-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  COLUNAS_CASCATA, ROTA_PARAMETROS_MARGEM, formatAliquota, formatDiaMes, linhasEmbalagens, linhasFrete, margemPct,
  motivoPedeConfiguracao, pctDoGmv, rotuloOrigemCustoPedido, rotuloOrigemImposto, textoMotivo,
} from 'src/utils/resultadoPedido'

const props = defineProps({
  resultado: { type: Object, default: null },
  // imposto | receita_liquida | frete | ads | producao | embalagens | produto | lucro_bruto
  coluna: { type: String, required: true },
  canal: { type: String, default: 'ml' },
  // por que não há cascata: fora_do_estudo | sem_cnpj | regime_nao_declarado | regime_nao_suportado |
  // sem_aliquota | nao_e_venda | antes_da_base | pendente
  motivo: { type: String, default: null },
})

const moeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0))
const fmtPct = (v) => (v == null ? '—' : `${String(v).replace('.', ',')}%`)

const r = computed(() => props.resultado || {})
const valor = computed(() => Number(r.value[props.coluna] || 0))
const pct = computed(() => pctDoGmv(valor.value, r.value))
// MCS-7: de onde veio cada parâmetro do pedido (alíquota digitada/PGDAS; produção e embalagem por pedido,
// detalhado ou não informado).
const origem = computed(() => {
  const o = r.value.origens || {}
  if (props.coluna === 'imposto') return rotuloOrigemImposto(o.aliquota)
  if (props.coluna === 'producao') return rotuloOrigemCustoPedido(o.producao)
  if (props.coluna === 'embalagens') return rotuloOrigemCustoPedido(o.embalagem)
  return ''
})

const sub = computed(() => {
  if ((props.coluna === 'producao' || props.coluna === 'embalagens') && origem.value === 'não informado') return 'não informado'
  if (props.coluna === 'imposto') return `${formatAliquota(r.value.aliquota_imposto)} do GMV`
  if (props.coluna === 'produto') return `${r.value.unidades || 0} un.`
  return pct.value == null ? '' : `${String(pct.value).replace('.', ',')}% do GMV`
})

const flag = computed(() => {
  if (props.coluna === 'ads' && r.value.ads_parcial) return 'parcial (D+1)'
  if (props.coluna === 'frete' && r.value.repasse_estimado) return 'repasse estimado'
  if (props.coluna === 'produto' && r.value.custo_incompleto) return `${r.value.unidades_sem_custo} un. sem custo`
  return ''
})

const marketplace = computed(() => (props.canal === 'shopee' ? 'Shopee' : 'Mercado Livre'))

const titulo = computed(() => ({
  imposto: 'Imposto (Simples Nacional)',
  frete: 'Frete',
  ads: 'Ads rateado',
  producao: 'Custo de produção/processamento',
  embalagens: 'Embalagens',
  produto: 'Custo do produto',
}[props.coluna] || props.coluna))

const linhas = computed(() => {
  const x = r.value
  switch (props.coluna) {
    case 'imposto':
      return [
        ['Alíquota efetiva', formatAliquota(x.aliquota_imposto)],
        ...(origem.value ? [['Origem', origem.value]] : []),
        ['Sobre o GMV', Number(x.gmv || 0)],
      ]
    case 'producao':
      return origem.value ? [['Origem', origem.value]] : []
    case 'frete':
      return [
        ...linhasFrete(x),
        [`Repasse ${marketplace.value}${x.repasse_estimado ? ' (estimado)' : ''}`, Number(x.repasse || 0)],
      ]
    case 'embalagens':
      return [...(origem.value ? [['Origem', origem.value]] : []), ...linhasEmbalagens(x)]
    case 'produto': {
      const origens = Object.entries(x.origens_custo || {}).map(([o, q]) => [`origem ${o}`, `${q} un.`])
      return [['Unidades', `${x.unidades || 0}`], ...origens]
    }
    default:
      return []
  }
})

const NAO_INFORMADO = 'Não informado em Parâmetros da margem: entra como zero.'
const nota = computed(() => {
  const o = origem.value
  if (props.coluna === 'imposto' && o === 'alíquota digitada') return 'Alíquota efetiva digitada em Parâmetros da margem, vigente na data da venda.'
  if (props.coluna === 'producao' || props.coluna === 'embalagens') {
    if (o === 'não informado') return NAO_INFORMADO
    if (o === 'valor por pedido') {
      return props.coluna === 'producao'
        ? 'Valor por pedido digitado em Parâmetros da margem, vigente na data da venda.'
        : 'Valor por pedido digitado em Parâmetros da margem; não entra em venda Full.'
    }
  }
  return notaPadrao.value
})
const notaPadrao = computed(() => ({
  imposto: 'DAS ÷ receita bruta das 3 últimas competências do PGDAS (média móvel ~90 dias), do CNPJ da conta.',
  frete: `O que o ${marketplace.value} desconta além das taxas: GMV − taxas − frete = repasse.`,
  ads: `Gasto de Ads da conta no dia × participação deste pedido no GMV do dia.${r.value.ads_parcial ? ' O gasto do dia ainda não chegou; recalcula no próximo sync.' : ''}`,
  producao: `Mão de obra de preparação por pedido (média móvel de 90 dias, rates de ${formatDiaMes(r.value.snapshot_data)}).`,
  embalagens: `Saco e etiqueta de identificação se fracionado; etiqueta de envio se postado; stretch se postado. Rates de ${formatDiaMes(r.value.snapshot_data)}.`,
  produto: 'Custo médio do Tiny vigente na data da venda, com o frete de compra lançado na nota.',
}[props.coluna] || ''))
</script>

<style scoped>
.cc { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; white-space: nowrap; cursor: default; }
.cc--vazio { color: #a0aec0; }
.cc-link { color: #3182ce; text-decoration: none; padding: 0 4px; }
.cc-link:hover { text-decoration: underline; }
.cc-main { font-size: 13px; font-weight: 500; color: #2d3748; font-variant-numeric: tabular-nums; }
.cc-strong { font-weight: 700; }
.cc-ded { color: #c05621; }
.cc-zero { color: #a0aec0; }
.cc-pos { color: #2f855a; }
.cc-neg { color: #c53030; }
.cc-sub { font-size: 10.5px; color: #718096; }
.cc-flag { font-size: 10px; color: #b7791f; background: #fefcbf; border-radius: 4px; padding: 0 4px; }
.cc-pill { font-size: 10.5px; font-weight: 600; border-radius: 10px; padding: 0 6px; }
.cc-pill--pos { background: #c6f6d5; color: #22543d; }
.cc-pill--neg { background: #fed7d7; color: #742a2a; }
.cc-tip-title { font-weight: 700; margin-bottom: 4px; }
.cc-tip-row { display: flex; justify-content: space-between; gap: 16px; font-variant-numeric: tabular-nums; }
.cc-tip-sub { font-weight: 700; border-top: 1px solid rgba(255,255,255,.25); margin-top: 2px; padding-top: 2px; }
.cc-tip-foot { margin-top: 6px; font-size: 11px; opacity: .8; white-space: normal; }
</style>
