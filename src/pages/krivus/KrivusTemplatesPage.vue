<template>
  <q-page class="krivus-page">
    <div class="krivus-container">

      <div class="page-header q-mb-lg">
        <div>
          <h1 class="page-title">Templates de Documentos</h1>
          <p class="page-subtitle">Modelos reutilizáveis com variáveis: <code>{{'{{'}}cliente{{'}}'}}</code>, <code>{{'{{'}}data_inicio{{'}}'}}</code>, <code>{{'{{'}}mensalidade{{'}}'}}</code>, <code>{{'{{'}}data_hoje{{'}}'}}</code></p>
        </div>
        <q-btn unelevated color="indigo-6" label="Novo Template" icon="add" no-caps @click="openNew" />
      </div>

      <div class="templates-grid" v-if="!loading">
        <div v-for="t in templates" :key="t.id" class="template-card" @click="openEdit(t)">
          <div class="row items-center q-mb-sm">
            <q-icon :name="docIcon(t.tipo)" size="20px" color="indigo-5" class="q-mr-sm" />
            <div class="template-name">{{ t.nome }}</div>
            <q-space />
            <q-chip dense color="indigo-1" text-color="indigo-8" :label="t.tipo" size="xs" />
          </div>
          <div class="template-meta">v{{ t.versao }} · atualizado {{ formatDate(t.updated_at) }}</div>
        </div>
      </div>
      <div class="templates-grid" v-else>
        <q-skeleton v-for="i in 4" :key="i" height="80px" class="template-card" />
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
            <q-select v-model="activeTemplate.tipo" :options="tipoOptions" emit-value map-options label="Tipo" outlined dense style="width:180px" />
          </div>
          <TipTapEditor v-model="activeTemplate.content" placeholder="Escreva o template aqui. Use {{cliente}}, {{data_inicio}}, {{mensalidade}}, {{data_hoje}} como variáveis." />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated label="Salvar" color="indigo-6" :loading="saving" @click="save" />
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

const $q = useQuasar()
const templates = ref([])
const loading = ref(true)
const dialogOpen = ref(false)
const saving = ref(false)
const activeTemplate = ref({ nome: '', tipo: 'outro', content: {} })

const tipoOptions = [
  { label: 'Contrato', value: 'contrato' },
  { label: 'Proposta', value: 'proposta' },
  { label: 'Relatório', value: 'relatorio' },
  { label: 'Faturamento / NF', value: 'nf' },
  { label: 'Outro', value: 'outro' },
]

function docIcon(tipo) {
  return { contrato: 'gavel', proposta: 'handshake', relatorio: 'bar_chart', nf: 'receipt', outro: 'description' }[tipo] || 'description'
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

<style scoped>
.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
.page-subtitle { color: #64748b; font-size: 13px; margin: 4px 0 0; }
.page-subtitle code { background: #eef2ff; color: #6366f1; padding: 1px 4px; border-radius: 4px; font-size: 12px; }

.templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.template-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.template-card:hover { border-color: #6366f1; box-shadow: 0 2px 12px rgba(99,102,241,0.1); }
.template-name { font-size: 14px; font-weight: 600; color: #1e293b; }
.template-meta { font-size: 11px; color: #94a3b8; }
</style>
