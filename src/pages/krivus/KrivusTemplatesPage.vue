<template>
  <q-page class="krivus-page">
    <div class="krivus-container">

      <SbPageHeader title="Templates de Documentos" icon="description">
        <template #actions>
          <q-btn unelevated color="primary" label="Novo Template" icon="add" no-caps @click="openNew" />
        </template>
      </SbPageHeader>
      <p class="page-subtitle q-mb-lg" v-pre>Modelos reutilizáveis com variáveis: <code>{{cliente}}</code>, <code>{{data_inicio}}</code>, <code>{{mensalidade}}</code>, <code>{{gmv_30d}}</code>, <code>{{roas}}</code>, <code>{{data_hoje}}</code></p>

      <div class="templates-grid" v-if="!loading">
        <SbCard v-for="t in templates" :key="t.id" hover class="template-card" @click="openEdit(t)">
          <div class="row items-center q-mb-sm">
            <q-icon :name="docIcon(t.tipo)" size="20px" color="primary" class="q-mr-sm" />
            <div class="template-name">{{ t.nome }}</div>
            <q-space />
            <SbBadge variant="teal">{{ tipoLabel(t.tipo) }}</SbBadge>
          </div>
          <div class="template-meta">v{{ t.versao }} · atualizado {{ formatDate(t.updated_at) }}</div>
        </SbCard>
      </div>
      <div class="templates-grid" v-else>
        <q-skeleton v-for="i in 4" :key="i" height="80px" />
      </div>

    </div>

    <!-- Template editor dialog -->
    <q-dialog v-model="dialogOpen" full-width>
      <q-card style="max-width: 860px; width: 100%">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ activeTemplate.id ? 'Editar Template' : 'Novo Template' }}</div>
          <q-space />
          <q-btn v-if="activeTemplate.id" flat round icon="delete" color="negative" @click="confirmDelete" />
          <q-btn flat round icon="close" color="grey" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <div class="row q-gutter-sm">
            <q-input v-model="activeTemplate.nome" label="Nome do template" outlined dense style="flex:1" />
            <q-select v-model="activeTemplate.tipo" :options="tipoOptions" emit-value map-options label="Tipo" outlined dense style="width:220px" />
          </div>
          <TipTapEditor v-model="activeTemplate.content" placeholder="Escreva o template aqui. Use {{cliente}}, {{data_inicio}}, {{mensalidade}}, {{gmv_30d}}, {{roas}}, {{data_hoje}} como variáveis." />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated label="Salvar" color="primary" :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import TipTapEditor from 'src/components/krivus/TipTapEditor.vue'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbBadge from 'src/components/common/SbBadge.vue'

const $q = useQuasar()
const templates = ref([])
const loading = ref(true)
const dialogOpen = ref(false)
const saving = ref(false)
const activeTemplate = ref({ nome: '', tipo: 'outro', content: {} })

const tipoOptions = [
  { label: 'Proposta', value: 'proposta' },
  { label: 'Contrato', value: 'contrato' },
  { label: 'Termo de Entrega', value: 'termo_entrega' },
  { label: 'Recibo de Pagamento', value: 'recibo_pagamento' },
  { label: 'Termo de Adesão - Gestão Contínua', value: 'termo_adesao' },
  { label: 'Relatório', value: 'relatorio' },
  { label: 'Faturamento / NF', value: 'nf' },
  { label: 'Outro', value: 'outro' },
]

function tipoLabel(tipo) {
  return tipoOptions.find((t) => t.value === tipo)?.label || tipo
}

function docIcon(tipo) {
  return {
    contrato: 'gavel', proposta: 'handshake', relatorio: 'bar_chart', nf: 'receipt',
    termo_entrega: 'task_alt', recibo_pagamento: 'payments', termo_adesao: 'handshake',
    outro: 'description',
  }[tipo] || 'description'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

async function load() {
  loading.value = true
  try {
    const res = await KrivusService.getTemplates()
    templates.value = res.data
  } finally {
    loading.value = false
  }
}

function openNew() {
  activeTemplate.value = { nome: '', tipo: 'outro', content: {} }
  dialogOpen.value = true
}

function openEdit(t) {
  activeTemplate.value = { ...t }
  dialogOpen.value = true
}

async function save() {
  saving.value = true
  try {
    if (activeTemplate.value.id) {
      await KrivusService.updateTemplate(activeTemplate.value.id, activeTemplate.value)
    } else {
      await KrivusService.createTemplate(activeTemplate.value)
    }
    dialogOpen.value = false
    await load()
    $q.notify({ type: 'positive', message: 'Template salvo!' })
  } finally {
    saving.value = false
  }
}

function confirmDelete() {
  $q.dialog({
    title: 'Deletar template',
    message: `Deletar "${activeTemplate.value.nome}"?`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    await KrivusService.deleteTemplate(activeTemplate.value.id)
    dialogOpen.value = false
    await load()
  })
}

onMounted(load)
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: $space-6 $space-6 $space-12; }
.page-subtitle { color: $text-muted; font-size: $text-small-size; margin-top: -12px; }
.page-subtitle code { background: $tint-teal-bg; color: $tint-teal-text; padding: 1px 4px; border-radius: 4px; font-size: 12px; }

.templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: $space-4; }
.template-card { cursor: pointer; }
.template-name { font-size: $text-small-size + 1; font-weight: $font-semibold; color: $text-primary; }
.template-meta { font-size: 11px; color: $text-disabled; }
</style>
