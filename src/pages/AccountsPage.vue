<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md q-gutter-md">

      <!-- ================================================================ -->
      <!-- MERCADO LIVRE                                                     -->
      <!-- ================================================================ -->
      <q-card flat bordered class="bg-white">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-grow row items-center">
              <img src="https://logospng.org/wp-content/uploads/mercado-livre.jpg" alt="MercadoLivre Logo"
                style="width: 50px; height: 50px; object-fit: contain" class="q-mr-md" />
              <div>
                <div class="text-subtitle2">Gerenciamento de</div>
                <div class="text-h6 text-weight-bold">Contas do MercadoLivre</div>
              </div>
            </div>
            <div class="col-auto">
              <q-btn color="white" text-color="primary" icon="add_circle" label="Adicionar Conta" @click="startMLAuth"
                :loading="isAuthenticating" class="q-px-md" size="lg" unelevated>
                <q-tooltip>Conectar nova conta do MercadoLivre</q-tooltip>
              </q-btn>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <template v-else>
            <div v-if="accounts.length > 0">
              <q-table :rows="accounts" :columns="columns" row-key="account_id" flat bordered separator="cell"
                :pagination="{ rowsPerPage: 10 }">

                <template v-slot:body-cell-cnpj="props">
                  <q-td :props="props">
                    {{ formatCNPJ(props.row.cnpj) }}
                  </q-td>
                </template>

                <template v-slot:body-cell-access_token="props">
                  <q-td :props="props" class="text-no-wrap">
                    {{ truncateToken(props.row.access_token) }}
                    <q-btn flat round dense color="primary" icon="content_copy" size="sm"
                      @click="copyToClipboard(props.row.access_token)">
                      <q-tooltip>Copiar token completo</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>

                <template v-slot:body-cell-refresh_token="props">
                  <q-td :props="props" class="text-no-wrap">
                    {{ truncateToken(props.row.refresh_token) }}
                    <q-btn flat round dense color="primary" icon="content_copy" size="sm"
                      @click="copyToClipboard(props.row.refresh_token)">
                      <q-tooltip>Copiar token completo</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>

                <template v-slot:body-cell-is_connected="props">
                  <q-td :props="props">
                    <q-chip :color="props.row.is_connected ? 'positive' : 'negative'" text-color="white" size="sm">
                      {{ props.row.is_connected ? "Conectado" : "Desconectado" }}
                    </q-chip>
                  </q-td>
                </template>

                <template v-slot:body-cell-token_expires_at="props">
                  <q-td :props="props">
                    {{ formatDate(props.row.token_expires_at) }}
                  </q-td>
                </template>

                <!-- Coluna Tiny ERP -->
                <template v-slot:body-cell-tiny_status="props">
                  <q-td :props="props" class="text-center">
                    <q-chip
                      :color="props.row.is_tiny_connected ? 'positive' : 'grey-4'"
                      :text-color="props.row.is_tiny_connected ? 'white' : 'grey-7'"
                      size="sm"
                      icon="receipt_long"
                    >
                      {{ props.row.is_tiny_connected ? 'Conectado' : 'Não conectado' }}
                    </q-chip>
                  </q-td>
                </template>

                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-center q-gutter-xs">
                    <!-- Conectar / Reconectar Tiny -->
                    <q-btn
                      flat round dense
                      :color="props.row.is_tiny_connected ? 'grey' : 'orange'"
                      icon="link"
                      size="sm"
                      @click="openTinySetup(props.row)"
                    >
                      <q-tooltip>{{ props.row.is_tiny_connected ? 'Reconfigurar Tiny ERP' : 'Conectar Tiny ERP' }}</q-tooltip>
                    </q-btn>

                    <!-- Sincronizar CMV (só se conectado) -->
                    <q-btn
                      v-if="props.row.is_tiny_connected"
                      flat round dense
                      color="teal"
                      icon="sync"
                      size="sm"
                      :loading="syncingCnpj === props.row.cnpj"
                      @click="syncTinyCMV(props.row)"
                    >
                      <q-tooltip>Sincronizar CMV (Tiny → SellerBot)</q-tooltip>
                    </q-btn>

                    <!-- Excluir conta ML -->
                    <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)">
                      <q-tooltip>Excluir conta ML</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </div>

            <div v-else class="text-center q-pa-xl">
              <q-icon name="account_circle" size="6em" color="grey-5" />
              <p class="text-h6 q-mt-md">Nenhuma conta encontrada.</p>
              <p class="text-subtitle1 q-mt-sm">Clique em "Adicionar Conta" para começar.</p>
            </div>
          </template>
        </q-card-section>
      </q-card>

    </div>

    <!-- ================================================================ -->
    <!-- DIALOG: Excluir conta ML                                          -->
    <!-- ================================================================ -->
    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">Tem certeza que deseja excluir esta conta?</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Excluir" color="negative" @click="deleteAccount" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ================================================================ -->
    <!-- DIALOG: Setup Tiny ERP                                            -->
    <!-- ================================================================ -->
    <q-dialog v-model="tinyDialog" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center bg-orange-1 q-pb-sm">
          <q-avatar icon="receipt_long" color="orange" text-color="white" />
          <div class="q-ml-md">
            <div class="text-h6">Conectar Tiny ERP</div>
            <div class="text-caption text-grey-7">
              Conta ML: <strong>{{ tinyForm.account_nickname }}</strong>
              — CNPJ: <strong>{{ formatCNPJ(tinyForm.cnpj) }}</strong>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <q-banner class="bg-blue-1 text-blue-9 rounded-borders" dense>
            <template v-slot:avatar><q-icon name="info" /></template>
            Acesse <strong>Tiny ERP → Configurações → Aplicativos</strong> para obter as credenciais do app <em>sellerbot</em>.
          </q-banner>

          <q-input
            v-model="tinyForm.client_id"
            label="Client ID"
            outlined dense
            :rules="[val => !!val || 'Obrigatório']"
          />
          <q-input
            v-model="tinyForm.client_secret"
            label="Client Secret"
            outlined dense
            type="password"
            :rules="[val => !!val || 'Obrigatório']"
          />
          <q-input
            :model-value="TINY_REDIRECT_URI"
            label="URL de Redirecionamento (já configurada no Tiny)"
            outlined dense
            readonly
            hint="Use exatamente esta URL ao cadastrar o app no Tiny"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            label="Conectar"
            color="orange"
            icon="open_in_new"
            :loading="tinyConnecting"
            @click="submitTinySetup"
            unelevated
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

const submitTinySetup = async () => {
  if (!tinyForm.value.client_id || !tinyForm.value.client_secret) {
    $q.notify({ message: 'Preencha Client ID e Client Secret.', color: 'warning', position: 'top' })
    return
  }
  tinyConnecting.value = true
  try {
    const { data } = await api.post('/erps/tiny/setup/', {
      cnpj:          tinyForm.value.cnpj,
      client_id:     tinyForm.value.client_id,
      client_secret: tinyForm.value.client_secret,
      redirect_uri:  TINY_REDIRECT_URI,
    })
    tinyDialog.value = false
    // Redireciona o usuário para autorizar no Tiny
    window.location.href = data.auth_url
  } catch (error) {
    console.error('Erro ao configurar Tiny:', error)
    $q.notify({ message: 'Erro ao configurar integração com o Tiny.', color: 'negative', position: 'top' })
  } finally {
    tinyConnecting.value = false
  }
}

const syncTinyCMV = async (account) => {
  if (!account.cnpj) return
  syncingCnpj.value = account.cnpj
  try {
    const { data } = await api.post('/erps/tiny/sync-products/', { cnpj: account.cnpj })
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
