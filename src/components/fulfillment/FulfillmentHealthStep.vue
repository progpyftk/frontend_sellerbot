<template>
  <section class="full-panel" aria-labelledby="full-health-title">
    <div class="full-panel__header">
      <div>
        <span class="full-kicker">ETAPA 1 · FONTES</span>
        <h2 id="full-health-title">Os dados estão prontos para decidir?</h2>
        <p>Confirme a conta, o inventário físico e o relatório oficial antes de calcular unidades.</p>
      </div>
      <q-select
        :model-value="accountId"
        :options="accountOptions"
        emit-value
        map-options
        outlined
        dense
        label="Conta Mercado Livre"
        class="full-account-select"
        @update:model-value="$emit('account', $event)"
      />
    </div>

    <div v-if="loading" class="full-state" role="status">
      <q-spinner-dots color="primary" size="36px" />
      <span>Verificando inventário, operações e vendas...</span>
    </div>
    <div v-else-if="!accountId" class="full-state">
      <q-icon name="storefront" size="34px" />
      <strong>Selecione uma conta conectada</strong>
    </div>
    <template v-else>
      <div v-if="health" class="full-health-summary" :class="`full-tone--${healthMetaValue.tone}`">
        <q-icon :name="healthMetaValue.icon" size="25px" />
        <div>
          <strong>{{ healthMetaValue.label }}</strong>
          <span>{{ healthSummary }}</span>
        </div>
      </div>

      <div class="full-health-grid" aria-label="Saúde das fontes">
        <article v-for="source in sourceRows" :key="source.key" class="full-source-card">
          <div class="full-source-card__top">
            <span class="full-source-card__icon"><q-icon :name="source.icon" size="19px" /></span>
            <span class="full-status" :class="`full-status--${source.meta.tone}`">
              <q-icon :name="source.meta.icon" size="13px" /> {{ source.meta.label }}
            </span>
          </div>
          <strong>{{ source.label }}</strong>
          <p>{{ source.helper }}</p>
          <small>{{ source.detail }}</small>
        </article>
      </div>

      <div class="full-two-columns">
        <article class="full-subpanel">
          <div class="full-subpanel__title">
            <div>
              <span class="full-kicker">RELATÓRIO OFICIAL</span>
              <h3>Planejamento ou Estoque Full</h3>
            </div>
            <FulfillmentSourceBadge source="official_ml_report" />
          </div>
          <p class="full-muted">Importe CSV ou XLSX exportado do Mercado Livre. Layouts desconhecidos são recusados.</p>
          <div class="full-import-row">
            <q-file
              v-model="file"
              outlined
              dense
              accept=".csv,.xlsx"
              label="Selecionar relatório"
              :disable="!canWrite"
            >
              <template #prepend><q-icon name="upload_file" /></template>
            </q-file>
            <q-select v-model="reportType" :options="reportTypes" emit-value map-options outlined dense label="Tipo" />
            <q-btn
              unelevated
              color="primary"
              no-caps
              label="Importar"
              :loading="importing"
              :disable="!file || !canWrite"
              @click="submitImport"
            />
          </div>
          <p v-if="!canWrite" class="full-inline-note"><q-icon name="visibility" /> Seu acesso permite consultar, mas não importar arquivos.</p>
          <q-select
            :model-value="selectedImportId"
            :options="importOptions"
            emit-value
            map-options
            clearable
            outlined
            dense
            label="Relatório usado no cálculo"
            class="q-mt-md"
            @update:model-value="$emit('import-id', $event)"
          />
          <div v-if="selectedImport" class="full-import-result" :class="`full-import-result--${selectedImport.status}`">
            <strong>{{ selectedImport.original_filename }}</strong>
            <span>{{ selectedImport.valid_count }} linhas válidas · {{ selectedImport.error_count }} para revisar</span>
          </div>
        </article>

        <article class="full-subpanel">
          <div class="full-subpanel__title">
            <div>
              <span class="full-kicker">HISTÓRICO</span>
              <h3>Rascunhos recentes</h3>
            </div>
            <q-icon name="history" size="22px" color="grey-6" />
          </div>
          <div v-if="drafts.length" class="full-draft-history">
            <button v-for="draft in drafts.slice(0, 4)" :key="draft.id" type="button" @click="$emit('open-draft', draft.id)">
              <span><strong>Versão {{ draft.version }}</strong><small>{{ draft.dispatch_date }} · {{ draft.line_count }} itens</small></span>
              <span class="full-status" :class="`full-status--${draftTone(draft.status)}`">{{ draftStatus(draft.status) }}</span>
            </button>
          </div>
          <div v-else class="full-empty-compact">Nenhum rascunho criado para esta conta.</div>
        </article>
      </div>

      <div class="full-actions">
        <div>
          <strong>{{ health?.status === 'blocked' ? 'Você pode continuar em modo diagnóstico.' : 'Pronto para configurar o envio.' }}</strong>
          <span>{{ health?.status === 'blocked' ? 'Linhas sem fonte obrigatória continuarão sem quantidade.' : 'A próxima etapa não grava nem envia nada.' }}</span>
        </div>
        <q-btn
          unelevated
          color="primary"
          no-caps
          icon-right="arrow_forward"
          label="Definir parâmetros"
          :disable="!accountId"
          @click="$emit('continue')"
        />
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import FulfillmentSourceBadge from './FulfillmentSourceBadge.vue'
import { healthMeta } from 'src/utils/fulfillmentDraft'

const props = defineProps({
  accountId: { type: String, default: '' },
  accountOptions: { type: Array, default: () => [] },
  health: { type: Object, default: null },
  imports: { type: Array, default: () => [] },
  selectedImportId: { type: Number, default: null },
  drafts: { type: Array, default: () => [] },
  loading: Boolean,
  importing: Boolean,
  canWrite: Boolean,
})
const emit = defineEmits(['account', 'import-id', 'upload', 'continue', 'open-draft'])
const file = ref(null)
const reportType = ref('planning')
const reportTypes = [
  { label: 'Planejamento Full', value: 'planning' },
  { label: 'Estoque Full', value: 'inventory' },
]
const healthMetaValue = computed(() => healthMeta(props.health?.status))
const healthSummary = computed(() => {
  if (!props.health) return 'Aguardando verificação.'
  if (props.health.status === 'ready') return `${props.health.full_items} produtos Full com fontes prontas.`
  const issues = [...(props.health.blockers || []), ...(props.health.reviews || [])].length
  return `${issues} fonte(s) precisam de atenção antes da execução.`
})
const sourceRows = computed(() => {
  const sources = props.health?.sources || {}
  return [
    { key: 'inventory', label: 'Inventário físico Full', icon: 'inventory_2', helper: 'Saldo disponível e ocupado por inventory ID.', detail: coverageDetail(sources.inventory), meta: healthMeta(sources.inventory?.status) },
    { key: 'operations', label: 'Operações do centro', icon: 'sync_alt', helper: 'Recepções, vendas e ajustes sincronizados.', detail: operationDetail(sources.operations), meta: healthMeta(sources.operations?.status) },
    { key: 'orders', label: 'Pedidos', icon: 'shopping_bag', helper: 'Vendas usadas para estimar a demanda.', detail: observedDetail(sources.orders), meta: healthMeta(sources.orders?.status) },
    { key: 'snapshots', label: 'Snapshots diários', icon: 'calendar_month', helper: 'Histórico para janelas de 7, 15 e 30 dias.', detail: snapshotDetail(sources.snapshots), meta: healthMeta(sources.snapshots?.status) },
  ]
})
const importOptions = computed(() => props.imports.map(item => ({
  label: `${item.original_filename} · ${item.valid_count}/${item.row_count} válidas`,
  value: item.id,
})))
const selectedImport = computed(() => props.imports.find(item => item.id === props.selectedImportId))

function coverageDetail(source) {
  if (!source) return 'Sem leitura.'
  return source.coverage == null ? 'Cobertura desconhecida.' : `${Math.round(source.coverage * 100)}% de cobertura · ${source.fresh}/${source.expected} frescos`
}
function operationDetail(source) { return source?.observed_at ? `${source.processed || 0} operações · última leitura ${new Date(source.observed_at).toLocaleString('pt-BR')}` : 'Nenhuma execução comprovada.' }
function observedDetail(source) { return source?.observed_at ? `Última sincronização ${new Date(source.observed_at).toLocaleString('pt-BR')}` : 'Sincronização não comprovada.' }
function snapshotDetail(source) { return source?.latest_date ? `${source.observed_days_30 || 0} dias observados · último em ${source.latest_date}` : 'Sem histórico qualificado.' }
function draftTone(status) { return ['reviewed', 'exported', 'submitted_manually'].includes(status) ? 'ready' : 'review' }
function draftStatus(status) { return { draft: 'Em revisão', reviewed: 'Revisado', exported: 'Exportado', submitted_manually: 'Criado no ML' }[status] || status }
function submitImport() {
  emit('upload', { file: file.value, reportType: reportType.value })
}
</script>
