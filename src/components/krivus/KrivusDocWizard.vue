<template>
  <q-dialog v-model="model" :persistent="step === 'review'" @hide="reset">
    <q-card class="wizard-card">

      <!-- Header -->
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-h6">{{ headerTitle }}</div>
          <div class="text-caption text-grey-6" v-if="client">{{ client.nome }}</div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" color="grey" v-close-popup />
      </q-card-section>

      <!-- Passo 0: escolher template -->
      <q-card-section v-if="step === 'pick'">
        <q-list bordered separator>
          <q-item v-for="t in templates" :key="t.id" clickable @click="pickTemplate(t)">
            <q-item-section avatar><q-icon name="description" color="primary" /></q-item-section>
            <q-item-section>
              <q-item-label>{{ t.nome }}</q-item-label>
              <q-item-label caption>{{ t.tipo }} · v{{ t.versao }}</q-item-label>
            </q-item-section>
            <q-item-section side><q-icon name="chevron_right" color="grey-4" /></q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <!-- Passo 1: dados -->
      <q-card-section v-else-if="step === 'form'">
        <div class="row items-center q-mb-md">
          <q-chip dense icon="description" color="teal-1" text-color="teal-9" :label="template.nome" />
          <q-btn v-if="templates.length > 1" flat dense size="sm" no-caps label="trocar" color="grey-6" @click="step = 'pick'" />
        </div>

        <template v-if="fields.clientFields.length">
          <div class="group-label">Dados do cliente <span class="group-hint">— salvos no cadastro, preenche uma vez</span></div>
          <div class="q-gutter-sm q-mb-md">
            <q-input
              v-for="f in fields.clientFields"
              :key="f.name"
              v-model="values[f.name]"
              :label="f.label"
              :hint="f.hint"
              outlined dense
            />
          </div>
        </template>

        <template v-if="fields.docFields.length">
          <div class="group-label">Dados deste documento</div>
          <div class="q-gutter-sm q-mb-md">
            <template v-for="f in fields.docFields" :key="f.name">
              <q-input
                v-if="f.type === 'textarea'"
                v-model="values[f.name]"
                :label="f.label" :hint="f.hint"
                type="textarea" autogrow outlined dense
              />
              <q-input
                v-else-if="f.type === 'currency'"
                v-model="values[f.name]"
                :label="f.label" :hint="f.hint"
                prefix="R$" outlined dense
              />
              <q-input
                v-else
                v-model="values[f.name]"
                :label="f.label" :hint="f.hint"
                :type="f.type === 'number' ? 'number' : 'text'"
                outlined dense
              />
            </template>
          </div>
        </template>

        <div v-if="fields.autoVars.length" class="q-mb-sm">
          <div class="group-label">Preenchido automaticamente</div>
          <div class="auto-chips">
            <q-chip v-for="v in fields.autoVars" :key="v.name" dense size="sm" icon="auto_awesome" color="grey-2" text-color="grey-8" :label="v.label" />
          </div>
        </div>

        <div v-if="!fields.clientFields.length && !fields.docFields.length" class="text-grey-6 text-caption q-mb-sm">
          Este template não precisa de nenhum dado extra — tudo é preenchido automaticamente.
        </div>
      </q-card-section>

      <!-- Passo 2: revisão -->
      <q-card-section v-else-if="step === 'review'">
        <q-input v-model="doc.titulo" borderless placeholder="Título do documento" class="q-mb-sm" input-style="font-size:17px; font-weight:600" />
        <div class="review-editor">
          <TipTapEditor v-model="doc.content" />
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions align="right" class="q-pa-md">
        <template v-if="step === 'form'">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated color="primary" label="Gerar documento" icon-right="arrow_forward" :loading="generating" @click="generate" />
        </template>
        <template v-else-if="step === 'review'">
          <q-btn flat color="primary" label="Baixar PDF" icon="picture_as_pdf" :loading="downloadingPdf" @click="downloadPdf" />
          <q-space />
          <q-btn flat label="Rascunho" color="grey" :loading="saving" @click="save('rascunho')" />
          <q-btn unelevated label="Finalizar" color="primary" :loading="saving" @click="save('finalizado')" />
        </template>
        <template v-else>
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
        </template>
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import TipTapEditor from 'src/components/krivus/TipTapEditor.vue'
import { buildWizardFields } from 'src/utils/krivusVariables'

const model = defineModel({ type: Boolean, default: false })

const props = defineProps({
  client: { type: Object, default: null },
  templates: { type: Array, default: () => [] },
  // Marco explícito para anexar o doc; sem ele o wizard acha o marco
  // "Estágio: <atual>" sozinho (útil no Kanban, que não carrega marcos).
  milestoneId: { type: [Number, String], default: null },
  // Pré-seleciona o template por tipo (fluxo "cliente entrou na etapa X").
  presetTipo: { type: String, default: null },
})

const emit = defineEmits(['created', 'client-updated'])

const $q = useQuasar()

const step = ref('pick') // pick -> form -> review
const template = ref(null)
const values = ref({})
const doc = ref({ titulo: '', content: {} })
const generating = ref(false)
const saving = ref(false)
const downloadingPdf = ref(false)

const fields = computed(() => buildWizardFields(template.value?.variables))

const headerTitle = computed(() => ({
  pick: 'Gerar documento',
  form: template.value?.nome || 'Gerar documento',
  review: 'Revisar documento',
}[step.value]))

const stageLabels = {
  lead: 'Lead', proposta_enviada: 'Proposta Enviada', contrato_assinado: 'Contrato Assinado',
  diagnostico: 'Diagnóstico', setup_implementacao: 'Setup & Implementação', entregue: 'Entregue',
  gestao_continua: 'Gestão Contínua', encerrado: 'Encerrado',
}

function reset() {
  step.value = 'pick'
  template.value = null
  values.value = {}
  doc.value = { titulo: '', content: {} }
}

// Chamado pelo pai logo depois de abrir (ou via watch do model)
function start() {
  reset()
  const preset = props.presetTipo && props.templates.find((t) => t.tipo === props.presetTipo)
  if (preset) pickTemplate(preset)
  else if (props.templates.length === 1) pickTemplate(props.templates[0])
}

defineExpose({ start })

function pickTemplate(t) {
  template.value = t
  values.value = {}
  // Pré-preenche os campos de grupo "cliente" com o que já está no cadastro
  for (const f of buildWizardFields(t.variables).clientFields) {
    if (f.clientField && props.client?.[f.clientField]) {
      values.value[f.name] = props.client[f.clientField]
    }
  }
  step.value = 'form'
}

function normalizedVariables() {
  const out = {}
  for (const f of [...fields.value.clientFields, ...fields.value.docFields]) {
    const raw = values.value[f.name]
    if (raw === undefined || raw === null || raw === '') continue
    // Campo de moeda: usuário digita "7.000,00", documento espera "R$ 7.000,00"
    out[f.name] = f.type === 'currency' && /^[\d.,\s]+$/.test(String(raw))
      ? `R$ ${String(raw).trim()}`
      : String(raw)
  }
  return out
}

async function resolveMilestoneId() {
  if (props.milestoneId) return props.milestoneId
  try {
    const res = await KrivusService.getMilestones(props.client.slug)
    const label = stageLabels[props.client.current_stage]
    const stageMilestone = res.data.find((m) => m.titulo === `Estágio: ${label}`)
    return stageMilestone?.id || null
  } catch {
    return null
  }
}

async function generate() {
  generating.value = true
  try {
    // Persiste os dados fiscais no Client — todo documento futuro herda
    const clientPatch = {}
    for (const f of fields.value.clientFields) {
      if (f.clientField && values.value[f.name] && values.value[f.name] !== props.client?.[f.clientField]) {
        clientPatch[f.clientField] = values.value[f.name]
      }
    }
    if (Object.keys(clientPatch).length) {
      const res = await KrivusService.updateClient(props.client.slug, clientPatch)
      emit('client-updated', res.data)
    }

    const milestoneId = await resolveMilestoneId()
    const res = await KrivusService.instantiateTemplate(
      template.value.id, props.client.slug, milestoneId, normalizedVariables(),
    )
    doc.value = { ...res.data }
    step.value = 'review'
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar documento.' })
  } finally {
    generating.value = false
  }
}

async function save(status) {
  saving.value = true
  try {
    const res = await KrivusService.updateDocument(props.client.slug, doc.value.id, {
      titulo: doc.value.titulo, content: doc.value.content, status,
    })
    doc.value = { ...res.data }
    emit('created', doc.value)
    if (status === 'finalizado') {
      model.value = false
      $q.notify({ type: 'positive', message: 'Documento finalizado!' })
    } else {
      $q.notify({ type: 'positive', message: 'Rascunho salvo.' })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar documento.' })
  } finally {
    saving.value = false
  }
}

async function downloadPdf() {
  downloadingPdf.value = true
  try {
    const res = await KrivusService.downloadDocumentPdf(props.client.slug, doc.value.id)
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(blobUrl, '_blank')
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF.' })
  } finally {
    downloadingPdf.value = false
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.wizard-card { min-width: 560px; max-width: 720px; width: 100%; }

.group-label {
  font-size: $text-xs-size;
  font-weight: $font-semibold;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: $space-2;
}
.group-hint { text-transform: none; letter-spacing: 0; font-weight: 400; color: $text-disabled; }

.auto-chips { display: flex; flex-wrap: wrap; gap: 4px; }

.review-editor {
  max-height: 55vh;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: $radius-md;
  padding: $space-2;
}
</style>
