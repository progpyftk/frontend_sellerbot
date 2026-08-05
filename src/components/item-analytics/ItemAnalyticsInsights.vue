<template>
  <SbCard class="insights-card">
    <template #header>
      <div class="insights-heading">
        <div>
          <div class="card-eyebrow">Evidências do período</div>
          <div class="card-title">O que merece atenção</div>
        </div>
        <q-btn flat round dense icon="refresh" aria-label="Atualizar insights" :loading="loading" @click="emit('retry')" />
      </div>
    </template>
    <div v-if="loading" class="insights-state"><SbEmptyState variant="loading" title="Analisando o período" /></div>
    <SbEmptyState v-else-if="error" variant="error" title="Insights indisponíveis" :message="error">
      <template #action><q-btn outline color="teal-8" label="Tentar novamente" @click="emit('retry')" /></template>
    </SbEmptyState>
    <SbEmptyState v-else-if="!causal" title="Sem evidências suficientes" message="Amplie o período ou aguarde mais observações do anúncio." />
    <div v-else class="insights-body">
      <div v-if="summaryCards.length" class="summary-grid">
        <div v-for="card in summaryCards" :key="card.label" class="summary-card">
          <span>{{ card.label }}</span><strong>{{ card.value }}</strong>
        </div>
      </div>
      <div v-if="causal.top_insights?.length" class="attention-box">
        <div class="section-label"><q-icon name="lightbulb" size="15px" /> Sinais observados</div>
        <div v-for="insight in causal.top_insights" :key="insight" class="attention-row">{{ insight }}</div>
      </div>
      <div v-if="correlations.length" class="insight-section">
        <div class="section-label"><q-icon name="compare_arrows" size="15px" /> Relações observadas</div>
        <div class="association-note">Associação não prova causalidade. O resultado depende da janela e do número de observações.</div>
        <div v-for="relation in correlations" :key="relation.fator" class="relation-row">
          <span class="relation-name">{{ relation.fator }}</span>
          <span class="relation-meter"><span :style="{ width: `${Math.min(Math.abs(relation.pearson_r || 0) * 100, 100)}%` }" :class="relation.direcao === 'positiva' ? 'positive' : 'negative'"></span></span>
          <SbBadge :variant="relation.direcao === 'positiva' ? 'teal' : 'red'">r={{ relation.pearson_r ?? '—' }}</SbBadge>
          <span v-if="relation.data_points || relation.n" class="relation-sample">n={{ relation.data_points || relation.n }}</span>
        </div>
      </div>
      <div v-if="promotion" class="insight-section">
        <div class="section-label"><q-icon name="local_offer" size="15px" /> Promoção</div>
        <div class="comparison-grid">
          <div><span>Com promoção · {{ promotion.dias_com_promo || 0 }}d</span><strong>{{ promotion.conv_com_promo_pct ?? '—' }}% conversão</strong><small>{{ promotion.gmv_medio_com_promo || '—' }} GMV/dia</small></div>
          <div><span>Sem promoção · {{ promotion.dias_sem_promo || 0 }}d</span><strong>{{ promotion.conv_sem_promo_pct ?? '—' }}% conversão</strong><small>{{ promotion.gmv_medio_sem_promo || '—' }} GMV/dia</small></div>
        </div>
        <div class="association-note">Comparação descritiva da janela observada; não é uma estimativa causal.</div>
      </div>
      <ItemAnalyticsEvents :timeline="timeline" />
    </div>
  </SbCard>
</template>

<script setup>
import { computed } from 'vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import ItemAnalyticsEvents from './ItemAnalyticsEvents.vue'
import { formatCurrency, formatNumber, formatPercent } from 'src/utils/itemAnalytics'

const props = defineProps({ causal: { type: Object, default: null }, timeline: { type: Object, default: null }, loading: Boolean, error: { type: String, default: '' } })
const emit = defineEmits(['retry'])
const summary = computed(() => props.causal?.resumo || {})
const summaryCards = computed(() => [
  { label: 'Visitas médias/dia', value: formatNumber(summary.value.visitas_media) },
  { label: 'Conversão média', value: formatPercent(summary.value.conversao_media) },
  { label: 'GMV total', value: formatCurrency(summary.value.gmv_total) },
  { label: 'Pedidos no período', value: formatNumber(summary.value.pedidos_total) },
].filter((card) => card.value !== '—'))
const correlations = computed(() => props.causal?.correlacoes?.visitas?.slice(0, 5) || [])
const promotion = computed(() => props.causal?.impacto_promocao?.dias_com_promo > 0 ? props.causal.impacto_promocao : null)
</script>

<style lang="scss" scoped>
.insights-heading { display: flex; align-items: flex-start; justify-content: space-between; width: 100%; }
.card-eyebrow { color: #0f766e; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.card-title { color: #0f172a; font-size: 15px; font-weight: 700; margin-top: 3px; }
.insights-state { min-height: 180px; display: grid; place-items: center; }
.insights-body { display: flex; flex-direction: column; gap: 18px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.summary-card { display: flex; flex-direction: column; gap: 5px; padding: 11px 12px; border: 1px solid #e2e8f0; border-radius: 9px; }
.summary-card span { color: #64748b; font-size: 11px; }
.summary-card strong { color: #0f172a; font-size: 16px; }
.section-label { display: flex; align-items: center; gap: 6px; color: #334155; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
.attention-box { padding: 12px; border-radius: 9px; background: #fffbeb; color: #92400e; }
.attention-row { font-size: 12px; line-height: 1.5; padding-top: 5px; }
.insight-section { border-top: 1px solid #f1f5f9; padding-top: 14px; }
.association-note { color: #64748b; font-size: 11px; line-height: 1.4; margin-bottom: 9px; }
.relation-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
.relation-name { color: #475569; flex: 0 1 180px; font-size: 12px; }
.relation-meter { width: 100px; height: 6px; overflow: hidden; background: #f1f5f9; border-radius: 99px; }
.relation-meter span { display: block; height: 100%; border-radius: inherit; }
.relation-meter .positive { background: #0f766e; }.relation-meter .negative { background: #dc2626; }
.relation-sample { color: #94a3b8; font-size: 11px; }
.comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.comparison-grid > div { display: flex; flex-direction: column; gap: 4px; padding: 10px; background: #f8fafc; border-radius: 8px; }
.comparison-grid span, .comparison-grid small { color: #64748b; font-size: 11px; }.comparison-grid strong { color: #0f172a; font-size: 14px; }
@media (max-width: 600px) { .summary-grid { grid-template-columns: 1fr 1fr; } .relation-name { flex-basis: 105px; } .relation-meter { flex: 1; } .comparison-grid { grid-template-columns: 1fr; } }
</style>
