<template>
  <!-- Faixa de KPIs da cascata no período filtrado (CUSTO-14): mesmas colunas da tabela, somadas. -->
  <div v-if="kpis && kpis.pedidos" class="ck">
    <div v-for="c in colunas" :key="c.chave" :class="['ck-item', c.subtotal ? 'ck-item--sub' : '', c.chave === 'lucro_bruto' ? (kpis.lucro_bruto >= 0 ? 'ck-pos' : 'ck-neg') : '']">
      <div class="ck-label">{{ c.rotulo }}</div>
      <div class="ck-val">{{ c.sinal < 0 && kpis[c.chave] ? '−' : '' }}{{ moeda(Math.abs(Number(kpis[c.chave] || 0))) }}</div>
      <div class="ck-sub">{{ sub(c) }}</div>
    </div>
    <div class="ck-item ck-item--sub">
      <div class="ck-label">Lucro bruto / pedido</div>
      <div class="ck-val">{{ moeda(kpis.lucro_bruto_medio) }}</div>
      <div class="ck-sub">{{ kpis.pedidos }} pedidos</div>
    </div>
    <div v-if="avisos" class="ck-aviso">
      <q-icon name="info_outline" size="12px" /> {{ avisos }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { COLUNAS_CASCATA } from 'src/utils/resultadoPedido'

const props = defineProps({
  kpis: { type: Object, default: null },
  canal: { type: String, default: 'ml' },
})

const moeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0))

// Produção e embalagens viram "Preparação" na faixa: o detalhe fica na tabela.
const colunas = computed(() => {
  const base = COLUNAS_CASCATA.filter((c) => !['producao', 'embalagens'].includes(c.chave))
  const i = base.findIndex((c) => c.chave === 'produto')
  base.splice(i, 0, { chave: 'preparacao', rotulo: 'Preparação', sinal: -1 })
  return base.map((c) => (c.chave === 'taxas' ? { ...c, rotulo: `Taxas ${props.canal === 'shopee' ? 'Shopee' : 'ML'}` } : c))
})

const sub = (c) => {
  const k = props.kpis
  if (c.chave === 'gmv') return `${k.pedidos} pedidos`
  if (c.chave === 'lucro_bruto') {
    return k.margem_contribuicao == null ? '' : `${(k.margem_contribuicao * 100).toFixed(1).replace('.', ',')}% do GMV`
  }
  if (!k.gmv) return ''
  return `${((Number(k[c.chave] || 0) / k.gmv) * 100).toFixed(1).replace('.', ',')}% do GMV`
}

const avisos = computed(() => {
  const k = props.kpis
  const partes = []
  if (k.pedidos_custo_incompleto) partes.push(`${k.pedidos_custo_incompleto} pedido(s) com custo incompleto`)
  if (k.pedidos_ads_parcial) partes.push(`${k.pedidos_ads_parcial} com Ads ainda parcial (D+1)`)
  if (k.pedidos_repasse_estimado) partes.push(`${k.pedidos_repasse_estimado} com repasse estimado`)
  return partes.join(' · ')
})
</script>

<style scoped>
.ck { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 16px 4px; }
.ck-item { flex: 1 1 110px; min-width: 110px; background: #fff; border: 1px solid #edf2f7; border-radius: 8px; padding: 6px 10px; }
.ck-item--sub { background: #f7fafc; }
.ck-pos { background: #f0fff4; border-color: #c6f6d5; }
.ck-neg { background: #fff5f5; border-color: #fed7d7; }
.ck-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; color: #718096; }
.ck-val { font-size: 14px; font-weight: 700; color: #2d3748; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ck-sub { font-size: 10.5px; color: #a0aec0; }
.ck-aviso { flex-basis: 100%; font-size: 11px; color: #975a16; }
@media (max-width: 599px) { .ck { padding: 8px 16px 4px; } .ck-item { flex: 1 1 calc(50% - 6px); } }
</style>
