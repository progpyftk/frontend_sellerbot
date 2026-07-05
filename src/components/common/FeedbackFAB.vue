<template>
  <div class="feedback-fab-container">
    <button class="feedback-fab" @click="open = true" aria-label="Reportar problema ou sugestão">
      <span class="fab-ring"></span>
      <q-icon name="mdi-message-alert-outline" size="26px" />
      <q-tooltip anchor="center left" self="center right" :offset="[12, 0]">
        Reportar problema ou sugestão
      </q-tooltip>
    </button>

    <q-dialog v-model="open" persistent>
      <div class="feedback-dialog">
        <div class="feedback-dialog-header">
          <div class="dialog-icon-wrap">
            <q-icon name="mdi-message-alert-outline" size="28px" />
          </div>
          <div>
            <div class="dialog-title">Nos ajude a melhorar!</div>
            <div class="dialog-subtitle">Seu feedback vai direto pra nossa sprint</div>
          </div>
          <q-btn flat round dense icon="close" class="dialog-close" @click="open = false" />
        </div>

        <div class="feedback-dialog-body">
          <div class="field-group">
            <label class="field-label">Tipo</label>
            <div class="type-chips">
              <button
                v-for="opt in typeOptions"
                :key="opt.value"
                :class="['type-chip', form.type === opt.value && 'type-chip--active']"
                @click="form.type = opt.value"
              >
                <span class="type-chip-emoji">{{ opt.emoji }}</span>
                <span class="type-chip-label">{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Título curto</label>
            <q-input
              v-model="form.title"
              outlined dense
              placeholder='Ex: "Botão de salvar não funciona nos pedidos"'
              maxlength="200"
              :rules="[v => !!v || 'Obrigatório']"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Descreva o que aconteceu</label>
            <q-input
              v-model="form.description"
              outlined dense
              type="textarea"
              :placeholder="descriptionPlaceholder"
              rows="4"
              :rules="[v => !!v || 'Obrigatório']"
            />
          </div>

          <div class="field-row">
            <q-checkbox v-model="form.is_urgent" label="Marcar como urgente" dense color="negative" />
            <q-icon name="info" size="14px" color="grey-5" class="urgent-info-icon">
              <q-tooltip>Use para bugs que estão impedindo seu trabalho</q-tooltip>
            </q-icon>

            <q-space />

            <span class="page-badge">
              <q-icon name="mdi-map-marker-outline" size="12px" />
              {{ currentPage }}
            </span>
          </div>
        </div>

        <div class="feedback-dialog-footer">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="open = false" />
          <q-btn
            unelevated no-caps label="Enviar Feedback"
            color="primary"
            :loading="submitting"
            @click="submit"
          />
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import CoreService from 'src/services/CoreService'

const $q = useQuasar()
const route = useRoute()

const open = ref(false)
const submitting = ref(false)

const currentPage = computed(() => route.path)

const typeOptions = [
  { value: 'bug',       label: 'Bug',       emoji: '🐛' },
  { value: 'feature',   label: 'Sugestão',  emoji: '💡' },
  { value: 'melhoria',  label: 'Melhoria',   emoji: '🔧' },
  { value: 'outro',     label: 'Outro',     emoji: '📌' },
]

const descriptionPlaceholder = computed(() => {
  const placeholders = {
    bug:       'O que você estava fazendo? O que esperava que acontecesse? O que aconteceu de diferente?',
    feature:   'Qual funcionalidade você gostaria de ver? Como ela ajudaria no seu dia a dia?',
    melhoria:  'O que poderia ser melhorado? Como você faria diferente?',
    outro:     'Conte-nos o que está pensando...',
  }
  return placeholders[form.type] || 'Descreva em detalhes...'
})

const form = reactive({
  type: 'bug',
  title: '',
  description: '',
  is_urgent: false,
})

async function submit() {
  if (!form.title || !form.description) return

  submitting.value = true
  try {
    const res = await CoreService.submitFeedback({
      type: form.type,
      title: form.title,
      description: form.description,
      page: currentPage.value,
      is_urgent: form.is_urgent,
    })

    const sprintId = res.data.sprint_id || 'FB-?'
    $q.notify({
      type: 'positive',
      message: `Valeu! Seu feedback foi registrado como ${sprintId} na sprint.`,
      caption: 'Já está na nossa lista de prioridades.',
      position: 'top',
      timeout: 5000,
    })

    open.value = false
    form.title = ''
    form.description = ''
    form.is_urgent = false
    form.type = 'bug'
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Erro ao enviar feedback.',
      caption: err?.response?.data?.detail || 'Tente novamente.',
      position: 'top',
      timeout: 4000,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.feedback-fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
}

.feedback-fab {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: none;
  background: #fff;
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.20), 0 2px 6px rgba(15, 23, 42, 0.08);
  transition: all 200ms ease;
  position: relative;
  overflow: visible;

  &:hover {
    transform: scale(1.06);
    box-shadow: 0 6px 24px rgba(245, 158, 11, 0.28), 0 3px 8px rgba(15, 23, 42, 0.10);
    color: #d97706;
  }

  &:active {
    transform: scale(0.96);
  }
}

.fab-ring {
  position: absolute;
  inset: -4px;
  border-radius: 20px;
  border: 2px solid rgba(245, 158, 11, 0.12);
  animation: fabPulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes fabPulse {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50%      { transform: scale(1.18); opacity: 0; }
}

/* ── Dialog ── */
.feedback-dialog {
  width: 480px;
  max-width: 95vw;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.feedback-dialog-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.dialog-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d97706;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.dialog-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 1px;
}

.dialog-close {
  margin-left: auto;
  color: #94a3b8 !important;
}

.feedback-dialog-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.type-chips {
  display: flex;
  gap: 8px;
}

.type-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px 8px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  &--active {
    border-color: #0d9488;
    background: #f0fdf9;
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
  }
}

.type-chip-emoji {
  font-size: 18px;
  line-height: 1;
}

.type-chip-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  .type-chip--active & {
    color: #0f766e;
  }
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.urgent-info-icon {
  cursor: help;
}

.page-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 3px 8px;
  font-family: monospace;
}

.feedback-dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}
</style>