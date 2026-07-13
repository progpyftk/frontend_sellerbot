<template>
  <q-dialog v-model="model" persistent @hide="reset">
    <q-card class="new-client-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Novo Cliente</div>
        <q-space />
        <q-btn flat round dense icon="close" color="grey" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <q-stepper v-model="step" flat animated header-nav color="primary" class="stepper">

          <!-- Passo 1: Quem — o suficiente para cadastrar um lead em 10 segundos -->
          <q-step :name="1" title="Quem" icon="person" :done="step > 1">
            <div class="q-gutter-sm">
              <q-input
                v-model="form.nome"
                label="Nome do cliente *"
                outlined dense autofocus
                :hint="slugPreview"
                @update:model-value="autoSlug"
              />
              <div class="row q-gutter-sm">
                <q-select
                  v-model="form.current_stage"
                  :options="stageOptions"
                  emit-value map-options
                  label="Estágio inicial" outlined dense style="flex:1"
                />
                <q-select
                  v-model="form.lead_origem"
                  :options="leadOrigemOptions"
                  emit-value map-options clearable
                  label="Origem do lead" outlined dense style="flex:1"
                />
              </div>
              <q-input
                v-if="isLeadStage"
                v-model.number="form.valor_proposta_enviada"
                label="Valor da proposta (R$)"
                prefix="R$" type="number" outlined dense
              />
              <div class="row q-gutter-sm">
                <q-input v-model="form.contato_telefone" label="Telefone" outlined dense style="flex:1" placeholder="(11) 99999-9999" />
                <q-input v-model="form.contato_email" label="E-mail" type="email" outlined dense style="flex:1" />
              </div>
              <div class="row items-center q-gutter-sm">
                <div class="text-caption text-grey-6">Cor:</div>
                <div class="row q-gutter-xs">
                  <div
                    v-for="cor in coresSugeridas"
                    :key="cor"
                    class="color-swatch"
                    :style="`background:${cor}; outline: ${form.cor_hex === cor ? '2px solid #1e293b' : 'none'}`"
                    @click="form.cor_hex = cor"
                  />
                </div>
              </div>
            </div>
          </q-step>

          <!-- Passo 2: Contrato — opcional, dá para preencher depois -->
          <q-step :name="2" title="Contrato" icon="gavel" :done="step > 2" caption="opcional">
            <div class="q-gutter-sm">
              <div class="row q-gutter-sm">
                <q-input v-model="form.data_inicio" label="Início do contrato" type="date" outlined dense style="flex:1" />
                <q-input v-model.number="form.mensalidade" label="Mensalidade" prefix="R$" type="number" outlined dense style="flex:1" />
              </div>
              <q-input v-model="form.razao_social" label="Razão social" outlined dense />
              <div class="row q-gutter-sm">
                <q-input v-model="form.cnpj" label="CNPJ" outlined dense style="flex:1" placeholder="00.000.000/0000-00" />
              </div>
              <q-input v-model="form.endereco" label="Endereço" outlined dense />
              <div class="text-caption text-grey-5">
                Esses dados preenchem automaticamente contratos e propostas gerados para este cliente.
              </div>
            </div>
          </q-step>

          <!-- Passo 3: Contas — opcional -->
          <q-step :name="3" title="Contas" icon="storefront" caption="opcional">
            <div class="q-gutter-sm">
              <div>
                <div class="text-caption text-grey-6 q-mb-xs">Contas Mercado Livre</div>
                <div v-if="loadingAccounts" class="text-caption text-grey-4">Carregando contas...</div>
                <div v-else class="accounts-checklist">
                  <q-checkbox
                    v-for="acc in mlAccounts" :key="acc.id"
                    v-model="form.ml_accounts" :val="acc.id"
                    :label="acc.account_nickname" color="amber-8" dense
                  />
                  <div v-if="!mlAccounts.length" class="text-caption text-grey-4">Nenhuma conta ML conectada.</div>
                </div>
              </div>
              <div>
                <div class="text-caption text-grey-6 q-mb-xs">Contas Shopee</div>
                <div class="accounts-checklist">
                  <q-checkbox
                    v-for="acc in shopeeAccounts" :key="acc.id"
                    v-model="form.shopee_accounts" :val="acc.id"
                    :label="acc.shop_name" color="deep-orange" dense
                  />
                  <div v-if="!shopeeAccounts.length" class="text-caption text-grey-4">Nenhuma conta Shopee conectada.</div>
                </div>
              </div>
            </div>
          </q-step>
        </q-stepper>
      </q-card-section>

      <q-card-actions class="q-pa-md">
        <q-btn v-if="step > 1" flat label="Voltar" color="grey" @click="step--" />
        <q-space />
        <q-btn v-if="step < 3" flat no-caps :label="step === 1 ? 'Dados do contrato' : 'Contas'" icon-right="arrow_forward" color="grey-7" @click="step++" />
        <q-btn
          unelevated label="Criar Cliente" color="primary"
          :loading="saving" :disable="!form.nome"
          @click="create"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import { api } from 'src/boot/axios'

const model = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['created'])
const $q = useQuasar()

const coresSugeridas = ['#0d9488', '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

const stageOptions = [
  { label: 'Lead', value: 'lead' },
  { label: 'Proposta Enviada', value: 'proposta_enviada' },
  { label: 'Contrato Assinado', value: 'contrato_assinado' },
]
const leadOrigemOptions = [
  { label: 'Indicação', value: 'indicacao' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Google', value: 'google' },
  { label: 'Evento', value: 'evento' },
  { label: 'Outro', value: 'outro' },
]

function freshForm() {
  return {
    nome: '', slug: '',
    // Lead recém-cadastrado ainda não tem contrato — hoje é o default são
    // (o backend exige a data; pedir isso no cadastro de lead é fricção).
    data_inicio: new Date().toISOString().split('T')[0],
    mensalidade: 0, cor_hex: '#0d9488',
    ml_accounts: [], shopee_accounts: [],
    current_stage: 'lead', lead_origem: null, valor_proposta_enviada: null,
    cnpj: '', razao_social: '', endereco: '',
    contato_nome: '', contato_email: '', contato_telefone: '',
  }
}

const step = ref(1)
const form = ref(freshForm())
const saving = ref(false)
const mlAccounts = ref([])
const shopeeAccounts = ref([])
const loadingAccounts = ref(false)

const isLeadStage = computed(() => ['lead', 'proposta_enviada'].includes(form.value.current_stage))
const slugPreview = computed(() => (form.value.slug ? `identificador: ${form.value.slug}` : ''))

function autoSlug(nome) {
  if (!nome) { form.value.slug = ''; return }
  form.value.slug = nome
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function reset() {
  step.value = 1
  form.value = freshForm()
}

async function loadAccounts() {
  loadingAccounts.value = true
  try {
    const [ml, sh] = await Promise.all([
      api.get('/mercadolivre/accounts/'),
      api.get('/shopee/accounts/'),
    ])
    mlAccounts.value = Array.isArray(ml.data) ? ml.data : (ml.data.results || [])
    shopeeAccounts.value = Array.isArray(sh.data) ? sh.data : (sh.data.results || [])
  } finally {
    loadingAccounts.value = false
  }
}

watch(model, (open) => {
  if (open && !mlAccounts.value.length && !shopeeAccounts.value.length) loadAccounts()
})

function humanizeError(e) {
  const data = e.response?.data
  if (!data) return 'Erro ao criar cliente.'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  // DRF: {campo: ["mensagem"]} -> "campo: mensagem"
  const first = Object.entries(data)[0]
  if (first) {
    const [field, msgs] = first
    const msg = Array.isArray(msgs) ? msgs[0] : msgs
    return field === 'slug' && String(msg).includes('exist')
      ? 'Já existe um cliente com esse nome/identificador.'
      : `${field}: ${msg}`
  }
  return 'Erro ao criar cliente.'
}

async function create() {
  saving.value = true
  try {
    const res = await KrivusService.createClient(form.value)
    model.value = false
    emit('created', res.data)
    $q.notify({ type: 'positive', message: `Cliente "${res.data.nome}" criado!` })
  } catch (e) {
    $q.notify({ type: 'negative', message: humanizeError(e) })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.new-client-card { min-width: 560px; max-width: 620px; }
.stepper { box-shadow: none; }
.stepper :deep(.q-stepper__step-inner) { padding-top: 8px; padding-bottom: 8px; }
.color-swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; transition: transform 0.1s; }
.color-swatch:hover { transform: scale(1.15); }
.accounts-checklist { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 0; }
</style>
