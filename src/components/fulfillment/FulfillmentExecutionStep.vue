<template>
  <section class="full-panel" aria-labelledby="full-execution-title">
    <div class="full-panel__header">
      <div>
        <span class="full-kicker">ETAPA 3 · EXECUÇÃO ASSISTIDA</span>
        <h2 id="full-execution-title">Leve a versão revisada ao Mercado Livre</h2>
        <p>O SellerBot prepara e registra. A criação, etiquetas e agenda continuam no painel oficial.</p>
      </div>
      <span v-if="draft" class="full-status" :class="`full-status--${statusTone}`"><q-icon :name="statusIcon" /> {{ statusLabel }}</span>
    </div>

    <div class="full-execution-hero">
      <div>
        <span class="full-kicker">VERSÃO CONGELADA</span>
        <h3>Rascunho v{{ draft?.version }}</h3>
        <p>{{ lines.length }} linhas · despacho {{ draft?.dispatch_date }} · chegada {{ draft?.expected_receipt_date }}</p>
      </div>
      <div class="full-execution-total"><span>Total planejado</span><strong>{{ totalUnits }}</strong><small>unidades revisadas</small></div>
    </div>

    <div v-if="notice" class="full-rollout-notice" role="status">
      <q-icon name="science" size="23px" />
      <div><strong>Validação em shadow mode</strong><span>{{ notice }}</span></div>
    </div>

    <div class="full-execution-grid">
      <article class="full-subpanel">
        <div class="full-subpanel__title"><div><span class="full-kicker">1 · CHECKLIST</span><h3>Antes de abrir o painel</h3></div><q-icon name="checklist" size="24px" /></div>
        <ul class="full-checklist">
          <li><q-icon name="check_circle" /><span><strong>Quantidades revisadas</strong><small>Oficial, SellerBot e ajuste humano registrados.</small></span></li>
          <li><q-icon name="check_circle" /><span><strong>Produtos separados</strong><small>Confirme o estoque físico local antes de continuar.</small></span></li>
          <li><q-icon name="check_circle" /><span><strong>Caixas e dimensões</strong><small>Respeite os múltiplos usados nesta versão.</small></span></li>
        </ul>
      </article>

      <article class="full-subpanel">
        <div class="full-subpanel__title"><div><span class="full-kicker">2 · ARTEFATO</span><h3>Checklist versionado</h3></div><q-icon name="description" size="24px" /></div>
        <p class="full-muted">O CSV contém somente linhas revisadas e fica vinculado a esta versão.</p>
        <div v-if="exports.length" class="full-export-file"><q-icon name="task" /><span><strong>{{ exports[0].filename }}</strong><small>{{ exports[0].line_count }} linhas · gerado em {{ formatDate(exports[0].created_at) }}</small></span></div>
        <q-btn unelevated color="primary" no-caps icon="download" label="Gerar e baixar checklist" :loading="exporting" :disable="!canWrite || !['reviewed', 'exported'].includes(draft?.status)" @click="$emit('export')" />
      </article>

      <article class="full-subpanel full-subpanel--official">
        <div class="full-subpanel__title"><div><span class="full-kicker">3 · MERCADO LIVRE</span><h3>Criar o envio oficial</h3></div><q-icon name="open_in_new" size="24px" /></div>
        <p class="full-muted">No Planejamento de envios, confira restrições, imprima etiquetas e agende a entrega.</p>
        <q-btn :href="panelUrl" target="_blank" rel="noopener noreferrer" outline color="primary" no-caps icon-right="open_in_new" label="Abrir Gestão de estoque Full" />
      </article>
    </div>

    <div class="full-submission-box">
      <div><span class="full-kicker">REGISTRO MANUAL</span><h3>O envio já foi criado no Mercado Livre?</h3><p>Registre uma referência para iniciar a conciliação das recepções.</p></div>
      <div class="full-submission-form">
        <q-input v-model="reference" outlined dense label="Referência do envio (opcional)" :disable="draft?.status === 'submitted_manually'" />
        <q-btn unelevated color="positive" no-caps icon="done_all" :label="draft?.status === 'submitted_manually' ? 'Envio registrado' : 'Marcar como criado no ML'" :loading="submitting" :disable="!canWrite || draft?.status !== 'exported'" @click="$emit('submit', reference)" />
      </div>
    </div>

    <div class="full-actions"><q-btn flat no-caps icon="arrow_back" label="Voltar à revisão" @click="$emit('back')" /><span class="full-muted">Nenhuma ação desta tela altera estoque pela API.</span></div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  draft: { type: Object, default: null },
  lines: { type: Array, default: () => [] },
  exports: { type: Array, default: () => [] },
  notice: { type: String, default: '' },
  exporting: Boolean,
  submitting: Boolean,
  canWrite: Boolean,
  panelUrl: { type: String, required: true },
})
defineEmits(['export', 'submit', 'back'])
const reference = ref(props.draft?.submitted_reference || '')
watch(() => props.draft?.submitted_reference, value => { reference.value = value || '' })
const totalUnits = computed(() => props.lines.reduce((total, line) => total + Number(line.effective_quantity || 0), 0))
const statusLabel = computed(() => ({ reviewed: 'Revisado', exported: 'Checklist gerado', submitted_manually: 'Criado no ML' }[props.draft?.status] || 'Em revisão'))
const statusTone = computed(() => props.draft?.status === 'submitted_manually' ? 'ready' : 'review')
const statusIcon = computed(() => props.draft?.status === 'submitted_manually' ? 'check_circle' : 'fact_check')
function formatDate(value) { return value ? new Date(value).toLocaleString('pt-BR') : '—' }
</script>
