<template>
  <q-page class="accounts-page">

    <!-- ══════════════════════════════════════════════════════ HEADER -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <img src="https://logospng.org/wp-content/uploads/mercado-livre.jpg" alt="ML"
            style="width: 22px; height: 22px; object-fit: contain; border-radius: 4px" />
        </div>
        <div>
          <div class="header-eyebrow">Gerenciamento</div>
          <div class="header-title">Contas MercadoLivre</div>
        </div>
      </div>
      <div class="header-right">
        <q-btn
          unelevated color="teal-7"
          icon="add_circle" label="Adicionar Conta"
          @click="startMLAuth"
          :loading="isAuthenticating"
          size="sm"
        >
          <q-tooltip>Conectar nova conta do MercadoLivre</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ CONTENT -->
    <div class="content-wrap">
      <div class="table-wrap">

        <div v-if="loading" class="flex flex-center q-pa-xl">
          <q-spinner color="teal-7" size="3em" />
        </div>

        <template v-else>
          <q-table
            v-if="accounts.length > 0"
            :rows="accounts"
            :columns="columns"
            row-key="account_id"
            flat
            :pagination="{ rowsPerPage: 10 }"
            class="accounts-table"
          >
            <template v-slot:header-cell="props">
              <q-th :props="props" class="th-cell">{{ props.col.label }}</q-th>
            </template>

            <template v-slot:body-cell-cnpj="props">
              <q-td :props="props">
                <span :class="props.row.cnpj ? 'td-val' : 'td-empty'">
                  {{ props.row.cnpj ? formatCNPJ(props.row.cnpj) : 'Clique para editar' }}
                </span>
                <q-popup-edit
                  :model-value="props.row.cnpj || ''"
                  @save="(val) => saveCnpj(props.row, val)"
                  v-slot="scope"
                  buttons label-set="Salvar" label-cancel="Cancelar"
                >
                  <q-input
                    v-model="scope.value"
                    label="CNPJ (somente números)"
                    dense autofocus
                    mask="##.###.###/####-##"
                    unmasked-value
                    hint="Ex: 41641514000103"
                  />
                </q-popup-edit>
              </q-td>
            </template>

            <template v-slot:body-cell-flex_delivery_cost="props">
              <q-td :props="props" class="text-center">
                <span class="td-val">R$ {{ Number(props.row.flex_delivery_cost || 12.50).toFixed(2) }}</span>
                <q-popup-edit
                  :model-value="String(props.row.flex_delivery_cost || 12.50)"
                  @save="(val) => saveFlexDeliveryCost(props.row, val)"
                  v-slot="scope"
                  buttons label-set="Salvar" label-cancel="Cancelar"
                >
                  <q-input
                    v-model="scope.value"
                    label="Custo estimado de entrega Flex (R$)"
                    type="number" step="0.01"
                    dense autofocus hint="Ex: 12.50"
                  />
                </q-popup-edit>
              </q-td>
            </template>

            <template v-slot:body-cell-access_token="props">
              <q-td :props="props" class="text-no-wrap">
                <span class="token-preview">{{ truncateToken(props.row.access_token) }}</span>
                <q-btn flat round dense color="teal-7" icon="content_copy" size="sm"
                  @click="copyToClipboard(props.row.access_token)">
                  <q-tooltip>Copiar token completo</q-tooltip>
                </q-btn>
              </q-td>
            </template>

            <template v-slot:body-cell-refresh_token="props">
              <q-td :props="props" class="text-no-wrap">
                <span class="token-preview">{{ truncateToken(props.row.refresh_token) }}</span>
                <q-btn flat round dense color="teal-7" icon="content_copy" size="sm"
                  @click="copyToClipboard(props.row.refresh_token)">
                  <q-tooltip>Copiar token completo</q-tooltip>
                </q-btn>
              </q-td>
            </template>

            <template v-slot:body-cell-is_connected="props">
              <q-td :props="props">
                <span :class="['status-chip', props.row.is_connected ? 'status-chip--pos' : 'status-chip--neg']">
                  {{ props.row.is_connected ? "Conectado" : "Desconectado" }}
                </span>
              </q-td>
            </template>

            <template v-slot:body-cell-token_expires_at="props">
              <q-td :props="props" class="td-muted">
                {{ formatDate(props.row.token_expires_at) }}
              </q-td>
            </template>

            <template v-slot:body-cell-tiny_status="props">
              <q-td :props="props" class="text-center">
                <span :class="['status-chip', props.row.is_tiny_connected ? 'status-chip--pos' : 'status-chip--neutral']">
                  <q-icon name="receipt_long" size="12px" class="q-mr-xs" />
                  {{ props.row.is_tiny_connected ? 'Conectado' : 'Não conectado' }}
                </span>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-center q-gutter-xs">
                <q-btn
                  flat round dense size="sm"
                  :color="props.row.is_tiny_connected ? 'grey-6' : 'amber-8'"
                  icon="link"
                  @click="openTinySetup(props.row)"
                >
                  <q-tooltip>{{ props.row.is_tiny_connected ? 'Reconfigurar Tiny ERP' : 'Conectar Tiny ERP' }}</q-tooltip>
                </q-btn>

                <q-btn
                  v-if="props.row.is_tiny_connected"
                  flat round dense size="sm" color="teal-7" icon="sync"
                  :loading="syncingCnpj === props.row.cnpj"
                  @click="syncCustoMedioProduto(props.row)"
                >
                  <q-tooltip>Sincronizar Custo Médio do Produto (Tiny → SellerBot)</q-tooltip>
                </q-btn>

                <q-btn flat round size="sm" color="negative" icon="delete"
                  @click="confirmDelete(props.row)">
                  <q-tooltip>Excluir conta ML</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>

          <div v-else class="empty-state">
            <q-icon name="account_circle" size="48px" style="color:#9aa0ac" />
            <div style="font-size:15px; font-weight:600; color:#1a1f36">Nenhuma conta encontrada</div>
            <div style="color:#9aa0ac; font-size:13px">Clique em "Adicionar Conta" para começar.</div>
          </div>
        </template>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ DIALOG: Excluir -->
    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 320px; border-radius: 12px">
        <q-card-section class="row items-center q-pb-sm">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm" style="font-weight:600; color:#1a1f36">Excluir esta conta?</span>
        </q-card-section>
        <q-card-section class="q-pt-none" style="color:#9aa0ac; font-size:13px">
          Esta ação é irreversível.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Excluir" color="negative" @click="deleteAccount" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ══════════════════════════════════════════════════════ DIALOG: Tiny ERP -->
    <q-dialog v-model="tinyDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <div class="dialog-header">
          <div class="header-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24)">
            <q-icon name="receipt_long" size="18px" />
          </div>
          <div>
            <div style="font-size: 15px; font-weight: 700; color: #1a1f36">Conectar Tiny ERP</div>
            <div style="font-size: 11px; color: #9aa0ac">
              {{ tinyForm.account_nickname }} — {{ formatCNPJ(tinyForm.cnpj) }}
            </div>
          </div>
        </div>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <q-banner class="bg-blue-1 text-blue-9 rounded-borders" dense>
            <template v-slot:avatar><q-icon name="info" /></template>
            Acesse <strong>Tiny ERP → Configurações → Aplicativos</strong> para obter as credenciais do app <em>sellerbot</em>.
          </q-banner>

          <q-input
            v-model="tinyForm.client_id"
            label="Client ID" outlined dense
            :rules="[val => !!val || 'Obrigatório']"
          />
          <q-input
            v-model="tinyForm.client_secret"
            label="Client Secret" outlined dense type="password"
            :rules="[val => !!val || 'Obrigatório']"
          />
          <q-input
            :model-value="TINY_REDIRECT_URI"
            label="URL de Redirecionamento"
            outlined dense readonly
            hint="Use exatamente esta URL ao cadastrar o app no Tiny"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn
            label="Conectar" unelevated
            color="amber-8"
            icon="open_in_new"
            :loading="tinyConnecting"
            @click="submitTinySetup"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { DateTime } from 'luxon'

const $q = useQuasar()

// --- ML Auth ---
const loading         = ref(true)
const accounts        = ref([])
const deleteDialog    = ref(false)
const accountToDelete = ref(null)
const isAuthenticating = ref(false)

const ML_CLIENT_ID    = '6026212895630598'
const isDevEnvironment = process.env.NODE_ENV === 'development'
const NGROK_URL        = 'https://iodimetric-fiona-protandrously.ngrok-free.dev'

const ML_REDIRECT_URI = isDevEnvironment
  ? `${NGROK_URL}/ml-redirect?env=dev`
  : 'https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect?env=prod'

// --- Tiny Auth ---
const tinyDialog     = ref(false)
const tinyConnecting = ref(false)
const syncingCnpj    = ref(null)

const TINY_REDIRECT_URI = isDevEnvironment
  ? `${NGROK_URL}/tiny/callback`
  : 'https://sellerbot-frontend-367123809032.us-central1.run.app/tiny/callback'

const tinyForm = ref({
  account_nickname: '',
  cnpj:             '',
  client_id:        '',
  client_secret:    '',
})

// --- Colunas ---
const columns = [
  { name: 'account_id',       align: 'left',   label: 'Seller ID',      field: 'account_id' },
  { name: 'account_nickname', align: 'left',   label: 'Nickname',       field: 'account_nickname' },
  { name: 'cnpj',             align: 'left',   label: 'CNPJ',           field: 'cnpj' },
  { name: 'access_token',     align: 'left',   label: 'Access Token',   field: 'access_token' },
  { name: 'refresh_token',    align: 'left',   label: 'Refresh Token',  field: 'refresh_token' },
  { name: 'is_connected',     align: 'center', label: 'ML Status',      field: 'is_connected' },
  { name: 'token_expires_at', align: 'left',   label: 'Token Expira em',field: 'token_expires_at' },
  { name: 'flex_delivery_cost', align: 'center', label: 'Frete Flex (R$)', field: 'flex_delivery_cost' },
  { name: 'tiny_status',      align: 'center', label: 'Tiny ERP',       field: 'is_tiny_connected' },
  { name: 'actions',          align: 'center', label: 'Ações',          field: 'actions' },
]

// --- Helpers ---
const truncateToken = (token) =>
  token && token.length > 10
    ? token.substring(0, 5) + '...' + token.substring(token.length - 5)
    : token || ''

const formatCNPJ = (value) => {
  if (!value) return ''
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return DateTime.fromISO(dateString, { zone: 'UTC' })
    .setZone('America/Sao_Paulo')
    .toFormat('dd/MM/yyyy HH:mm')
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
    .then(() => $q.notify({ message: 'Token copiado!', color: 'positive', position: 'top', timeout: 2000 }))
    .catch(err => $q.notify({ message: `Erro ao copiar: ${err.message}`, color: 'negative', position: 'top' }))
}

// --- ML ---
const getAccounts = async () => {
  loading.value = true
  try {
    const response = await api.get('/mercadolivre/accounts/')
    if (response.data && Array.isArray(response.data.results)) {
      accounts.value = response.data.results
    } else if (Array.isArray(response.data)) {
      accounts.value = response.data
    } else {
      accounts.value = []
    }
  } catch (error) {
    console.error('Erro ao buscar contas:', error)
    $q.notify({ message: 'Erro ao buscar contas', color: 'negative', position: 'top' })
    accounts.value = []
  } finally {
    loading.value = false
  }
}

const startMLAuth = () => {
  isAuthenticating.value = true
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}`
  window.location.href = authUrl
}

const handleAuthSuccess = async (code) => {
  try {
    loading.value = true
    const response = await api.post('/mercadolivre/auth/', { code, redirect_uri: ML_REDIRECT_URI })
    if (response.data?.success) {
      $q.notify({ message: 'Conta adicionada!', color: 'positive' })
      await getAccounts()
    }
  } catch (error) {
    console.error('Erro na autenticação:', error)
    $q.notify({ message: 'Erro na autenticação', color: 'negative' })
  } finally {
    loading.value = false
    isAuthenticating.value = false
  }
}

const confirmDelete = (account) => {
  accountToDelete.value = account
  deleteDialog.value = true
}

const deleteAccount = async () => {
  if (!accountToDelete.value) return
  try {
    await api.delete(`/mercadolivre/accounts/${accountToDelete.value.account_id}/`)
    $q.notify({ message: 'Conta excluída', color: 'positive' })
    await getAccounts()
  } catch (error) {
    $q.notify({ message: 'Erro ao excluir conta', color: 'negative' })
  } finally {
    deleteDialog.value = false
    accountToDelete.value = null
  }
}

// --- Tiny ---
const openTinySetup = (account) => {
  if (!account.cnpj) {
    $q.notify({
      message: 'Esta conta não tem CNPJ cadastrado. Edite a conta e informe o CNPJ primeiro.',
      color: 'warning',
      position: 'top',
    })
    return
  }
  tinyForm.value = {
    account_nickname: account.account_nickname,
    cnpj:             account.cnpj,
    client_id:        '',
    client_secret:    '',
  }
  tinyDialog.value = true
}

const saveFlexDeliveryCost = async (account, value) => {
  const cost = parseFloat(value)
  if (isNaN(cost) || cost < 0) {
    $q.notify({ message: 'Valor inválido.', color: 'warning', position: 'top' })
    return
  }
  try {
    await api.patch(`/mercadolivre/accounts/${account.account_id}/settings/`, { flex_delivery_cost: cost })
    account.flex_delivery_cost = cost
    $q.notify({ message: 'Frete Flex atualizado!', color: 'positive', position: 'top', timeout: 2000 })
  } catch (error) {
    console.error('Erro ao salvar frete Flex:', error)
    $q.notify({ message: 'Erro ao salvar frete Flex.', color: 'negative', position: 'top' })
  }
}

const saveCnpj = async (account, cnpj) => {
  const digits = (cnpj || '').replace(/\D/g, '')
  try {
    await api.patch(`/mercadolivre/accounts/${account.account_id}/cnpj/`, { cnpj: digits })
    account.cnpj = digits
    $q.notify({ message: 'CNPJ salvo!', color: 'positive', position: 'top', timeout: 2000 })
  } catch (error) {
    console.error('Erro ao salvar CNPJ:', error)
    $q.notify({ message: 'Erro ao salvar CNPJ.', color: 'negative', position: 'top' })
  }
}

const submitTinySetup = async () => {
  if (!tinyForm.value.client_id || !tinyForm.value.client_secret) {
    $q.notify({ message: 'Preencha Client ID e Client Secret.', color: 'warning', position: 'top' })
    return
  }
  tinyConnecting.value = true
  try {
    const { data } = await api.post('/api/erps/tiny/setup/', {
      cnpj:          tinyForm.value.cnpj,
      client_id:     tinyForm.value.client_id,
      client_secret: tinyForm.value.client_secret,
      redirect_uri:  TINY_REDIRECT_URI,
    })
    tinyDialog.value = false
    window.location.href = data.auth_url
  } catch (error) {
    console.error('Erro ao configurar Tiny:', error)
    $q.notify({ message: 'Erro ao configurar integração com o Tiny.', color: 'negative', position: 'top' })
  } finally {
    tinyConnecting.value = false
  }
}

const syncCustoMedioProduto = async (account) => {
  if (!account.cnpj) return
  syncingCnpj.value = account.cnpj
  try {
    const { data } = await api.post('/api/erps/tiny/sync-products/', { cnpj: account.cnpj })
    $q.notify({
      message: `Sync concluído: ${data.synced} produtos atualizados, ${data.skipped} sem SKU, ${data.errors} erros.`,
      color: data.errors > 0 ? 'warning' : 'positive',
      position: 'top',
      timeout: 5000,
    })
  } catch (error) {
    console.error('Erro no sync Tiny:', error)
    $q.notify({ message: 'Erro ao sincronizar produtos do Tiny.', color: 'negative', position: 'top' })
  } finally {
    syncingCnpj.value = null
  }
}

// --- Lifecycle ---
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  if (code) {
    handleAuthSuccess(code)
    window.history.replaceState({}, document.title, window.location.pathname)
  }
  getAccounts()
})
</script>

<style scoped>
.accounts-page { background: #f5f7fa; min-height: 100vh; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px 16px; background: #fff;
  border-bottom: 1.5px solid #e8edf3; gap: 16px; flex-wrap: wrap;
}
.header-left  { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; align-items: center; gap: 10px; }
.header-icon  {
  width: 36px; height: 36px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #0d9488, #2dd4bf); color: #fff;
  flex-shrink: 0;
}
.header-eyebrow { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title   { font-size: 17px; font-weight: 700; color: #1a1f36; }

.content-wrap { padding: 20px 24px; }

.table-wrap {
  background: #fff; border-radius: 10px;
  border: 1.5px solid #e8edf3; overflow: hidden;
}
.accounts-table { background: transparent; }
.th-cell {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #9aa0ac; white-space: nowrap;
  border-bottom: 1.5px solid #e8edf3;
}

.td-val   { color: #1a1f36; font-size: 13px; }
.td-empty { color: #9aa0ac; font-style: italic; font-size: 13px; }
.td-muted { color: #9aa0ac; font-size: 12px; }
.token-preview { font-family: monospace; font-size: 12px; color: #9aa0ac; }

.status-chip {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 600; border-radius: 12px;
  padding: 2px 10px;
}
.status-chip--pos     { background: #dcfce7; color: #16a34a; }
.status-chip--neg     { background: #fef2f2; color: #ef4444; }
.status-chip--neutral { background: #f3f4f6; color: #6b7280; }

.empty-state {
  text-align: center; padding: 60px 24px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}

.dialog-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px;
}
</style>
