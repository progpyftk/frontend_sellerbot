<template>
  <q-page class="accounts-page">

    <!-- ══════════════════════════════════════════════════════ HEADER -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <q-icon name="store" size="20px" />
        </div>
        <div>
          <div class="header-eyebrow">Gerenciamento</div>
          <div class="header-title">Contas Marketplaces</div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ TABS -->
    <div class="tabs-container">
      <div class="tabs-wrap">
        <button :class="['tab-btn', activeTab === 'ml' ? 'tab-btn--active' : '']" @click="activeTab = 'ml'">
          <img src="https://logospng.org/wp-content/uploads/mercado-livre.jpg" alt="ML" class="tab-logo" />
          Mercado Livre
          <span class="tab-count" v-if="mlAccounts.length > 0">{{ mlAccounts.length }}</span>
        </button>
        <button :class="['tab-btn', activeTab === 'shopee' ? 'tab-btn--active' : '']" @click="activeTab = 'shopee'">
          <div class="tab-shopee-badge">SHOPEE</div>
          Shopee
          <span class="tab-count" v-if="shopeeAccounts.length > 0">{{ shopeeAccounts.length }}</span>
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ CONTENT -->
    <div class="content-wrap">

      <!-- ==================== BANNER TINY DESCONECTADO ==================== -->
      <q-banner
        v-if="tinyDisconnectedAccounts.length > 0"
        class="bg-amber-1 text-amber-9 q-mb-md rounded-borders"
        dense
      >
        <template v-slot:avatar>
          <q-icon name="warning" color="amber-8" />
        </template>
        <strong>Tiny ERP desconectado</strong> em
        {{ tinyDisconnectedAccounts.map(a => formatCNPJ(a.cnpj)).join(', ') }}.
        Clique no ícone <q-icon name="link" size="14px" /> de cada conta para reconectar.
      </q-banner>

      <!-- ==================== TAB MERCADO LIVRE ==================== -->
      <div v-show="activeTab === 'ml'" class="tab-content">
        <div class="tab-header">
          <div class="tab-title">Contas Mercado Livre</div>
          <q-btn unelevated color="teal-7" icon="add_circle" label="Adicionar Conta ML" @click="startMLAuth"
            :loading="isAuthenticating" size="sm">
            <q-tooltip>Conectar nova conta do MercadoLivre</q-tooltip>
          </q-btn>
        </div>

        <div class="table-wrap">
          <div v-if="loadingML" class="flex flex-center q-pa-xl">
            <q-spinner color="teal-7" size="3em" />
          </div>

          <template v-else>
            <q-table v-if="mlAccounts.length > 0" :rows="mlAccounts" :columns="mlColumns" row-key="account_id" flat
              :pagination="{ rowsPerPage: 10 }" class="accounts-table">
              <template v-slot:header-cell="props">
                <q-th :props="props" class="th-cell">{{ props.col.label }}</q-th>
              </template>

              <template v-slot:body-cell-cnpj="props">
                <q-td :props="props">
                  <span :class="props.row.cnpj ? 'td-val' : 'td-empty'">
                    {{ props.row.cnpj ? formatCNPJ(props.row.cnpj) : 'Clique para editar' }}
                  </span>
                  <q-popup-edit :model-value="props.row.cnpj || ''" @save="(val) => saveCnpj(props.row, val)"
                    v-slot="scope" buttons label-set="Salvar" label-cancel="Cancelar">
                    <q-input v-model="scope.value" label="CNPJ (somente números)" dense autofocus
                      mask="##.###.###/####-##" unmasked-value hint="Ex: 41641514000103" />
                  </q-popup-edit>
                </q-td>
              </template>

              <template v-slot:body-cell-flex_delivery_cost="props">
                <q-td :props="props" class="text-center">
                  <span class="td-val">R$ {{ Number(props.row.flex_delivery_cost || 12.50).toFixed(2) }}</span>
                  <q-popup-edit :model-value="String(props.row.flex_delivery_cost || 12.50)"
                    @save="(val) => saveFlexDeliveryCost(props.row, val)" v-slot="scope" buttons label-set="Salvar"
                    label-cancel="Cancelar">
                    <q-input v-model="scope.value" label="Custo estimado de entrega Flex (R$)" type="number" step="0.01"
                      dense autofocus hint="Ex: 12.50" />
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
                  <span
                    :class="['status-chip', props.row.is_tiny_connected ? 'status-chip--pos' : 'status-chip--neutral']">
                    <q-icon name="receipt_long" size="12px" class="q-mr-xs" />
                    {{ props.row.is_tiny_connected ? 'Conectado' : 'Não' }}
                  </span>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-center q-gutter-xs">
                  <q-btn flat round dense size="sm" :color="props.row.is_tiny_connected ? 'grey-6' : 'amber-8'"
                    icon="link" @click="openTinySetup(props.row)">
                    <q-tooltip>{{ props.row.is_tiny_connected ? 'Reconfigurar Tiny ERP' : 'Conectar Tiny ERP'
                      }}</q-tooltip>
                  </q-btn>

                  <q-btn v-if="props.row.is_tiny_connected" flat round dense size="sm" color="teal-7" icon="sync"
                    :loading="syncingCnpj === props.row.cnpj" @click="syncCustoMedioProduto(props.row)">
                    <q-tooltip>Sync Custos (Tiny)</q-tooltip>
                  </q-btn>

                  <q-btn v-if="props.row.user === currentUserId" flat round dense size="sm" color="indigo-5" icon="group"
                    @click="openShareDialog('ml', props.row)">
                    <q-tooltip>Compartilhar conta</q-tooltip>
                  </q-btn>

                  <q-btn v-if="props.row.user === currentUserId" flat round size="sm" color="negative" icon="delete" @click="confirmDeleteML(props.row)">
                    <q-tooltip>Excluir conta ML</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>

            <div v-else class="empty-state">
              <q-icon name="account_circle" size="48px" style="color:#9aa0ac" />
              <div style="font-size:15px; font-weight:600; color:#1a1f36">Nenhuma conta Mercado Livre</div>
              <div style="color:#9aa0ac; font-size:13px">Clique em "Adicionar Conta ML" para começar.</div>
            </div>
          </template>
        </div>
      </div>

      <!-- ==================== TAB SHOPEE ==================== -->
      <div v-show="activeTab === 'shopee'" class="tab-content">
        <div class="tab-header">
          <div class="tab-title">Contas Shopee</div>
          <q-btn unelevated color="deep-orange" icon="add_circle" label="Conectar Conta Shopee" @click="connectShopee"
            :loading="connectingShopee" size="sm">
            <q-tooltip>Conectar nova conta da Shopee</q-tooltip>
          </q-btn>
        </div>

        <div class="table-wrap">
          <div v-if="loadingShopee" class="flex flex-center q-pa-xl">
            <q-spinner color="deep-orange" size="3em" />
          </div>

          <template v-else>
            <q-table v-if="shopeeAccounts.length > 0" :rows="shopeeAccounts" :columns="shopeeColumns" row-key="id" flat
              :pagination="{ rowsPerPage: 10 }" class="accounts-table">
              <template v-slot:header-cell="props">
                <q-th :props="props" class="th-cell">{{ props.col.label }}</q-th>
              </template>

              <template v-slot:body-cell-shop_name="props">
                <q-td :props="props">
                  <div class="shopee-name">{{ props.row.shop_name || props.row.shop_id }}</div>
                  <div class="td-muted">ID: {{ props.row.shop_id }}</div>
                </q-td>
              </template>

              <template v-slot:body-cell-is_connected="props">
                <q-td :props="props">
                  <span :class="['status-chip', props.row.is_connected ? 'status-chip--pos' : 'status-chip--neg']">
                    {{ props.row.is_connected ? 'Conectada' : 'Desconectada' }}
                  </span>
                </q-td>
              </template>

              <template v-slot:body-cell-token_expires_at="props">
                <q-td :props="props" class="td-muted">
                  {{ formatDate(props.row.token_expires_at) }}
                </q-td>
              </template>

              <template v-slot:body-cell-direct_delivery_cost="props">
                <q-td :props="props" class="text-center">
                  <span class="td-val">R$ {{ Number(props.row.direct_delivery_cost ?? 8.00).toFixed(2) }}</span>
                  <q-popup-edit :model-value="String(props.row.direct_delivery_cost ?? 8.00)"
                    @save="(val) => saveDirectDeliveryCost(props.row, val)" v-slot="scope" buttons label-set="Salvar"
                    label-cancel="Cancelar">
                    <q-input v-model="scope.value" label="Custo estimado de Entrega Direta (R$)" type="number" step="0.01"
                      dense autofocus hint="Ex: 8.00" />
                  </q-popup-edit>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-center q-gutter-xs">
                  <q-btn flat round dense size="sm" color="deep-orange" icon="sync"
                    :loading="syncingShopee === props.row.id" @click="syncShopeeOrders(props.row.id)">
                    <q-tooltip>Sync Pedidos</q-tooltip>
                  </q-btn>

                  <q-btn flat round dense size="sm" color="deep-orange" icon="inventory"
                    @click="syncShopeeItems(props.row.id)">
                    <q-tooltip>Sync Produtos</q-tooltip>
                  </q-btn>

                  <q-btn flat round dense size="sm" color="grey-6" icon="refresh"
                    :loading="refreshingShopee === props.row.id" @click="refreshShopeeToken(props.row.id)">
                    <q-tooltip>Renovar Token</q-tooltip>
                  </q-btn>

                  <q-btn v-if="props.row.user === currentUserId" flat round dense size="sm" color="indigo-5" icon="group"
                    @click="openShareDialog('shopee', props.row)">
                    <q-tooltip>Compartilhar conta</q-tooltip>
                  </q-btn>

                  <q-btn v-if="props.row.user === currentUserId" flat round size="sm" color="negative" icon="delete" @click="confirmDeleteShopee(props.row)">
                    <q-tooltip>Excluir conta Shopee</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>

            <div v-else class="empty-state">
              <div class="shopee-empty-icon">
                <div class="shopee-badge">SHOPEE</div>
              </div>
              <div style="font-size:15px; font-weight:600; color:#1a1f36">Nenhuma conta Shopee</div>
              <div style="color:#9aa0ac; font-size:13px">Clique em "Conectar Conta Shopee" para começar.</div>
            </div>
          </template>
        </div>
      </div>

    </div>

    <!-- ══════════════════════════════════════════════════════ DIALOGS -->

    <!-- Delete ML -->
    <q-dialog v-model="deleteDialogML">
      <q-card style="min-width: 320px; border-radius: 12px">
        <q-card-section class="row items-center q-pb-sm">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm" style="font-weight:600; color:#1a1f36">Excluir conta ML?</span>
        </q-card-section>
        <q-card-section class="q-pt-none" style="color:#9aa0ac; font-size:13px">
          Esta ação é irreversível.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Excluir" color="negative" @click="deleteMLAccount" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Shopee -->
    <q-dialog v-model="deleteDialogShopee">
      <q-card style="min-width: 320px; border-radius: 12px">
        <q-card-section class="row items-center q-pb-sm">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm" style="font-weight:600; color:#1a1f36">Excluir conta Shopee?</span>
        </q-card-section>
        <q-card-section class="q-pt-none" style="color:#9aa0ac; font-size:13px">
          Esta ação é irreversível.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Excluir" color="negative" @click="deleteShopeeAccount" />
        </q-card-actions>
      </q-card>
    </q-dialog>


    <!-- Connect Shopee Dialog -->
    <q-dialog v-model="shopeeConnectDialog" persistent>
      <q-card style="min-width: 440px; border-radius: 12px">
        <div class="dialog-header">
          <div class="header-icon" style="background: linear-gradient(135deg, #ff6600, #ee4d2d)">
            <q-icon name="storefront" size="18px" />
          </div>
          <div>
            <div style="font-size: 15px; font-weight: 700; color: #1a1f36">Conectar Loja Shopee</div>
            <div style="font-size: 11px; color: #9aa0ac">Credenciais do seu App no Shopee Open Platform</div>
          </div>
        </div>
        <q-separator />
        <q-card-section class="q-gutter-md">
          <q-banner class="bg-orange-1 text-orange-9 rounded-borders" dense>
            <template v-slot:avatar><q-icon name="info" /></template>
            Acesse <strong>Shopee Open Platform → My Apps</strong> e copie o <strong>Live Partner ID</strong> e <strong>Live API Partner Key</strong> do seu app.
          </q-banner>
          <q-input v-model="shopeeConnectForm.partner_id" label="Live Partner ID" outlined dense
            :rules="[val => !!val || 'Obrigatório']" hint="Ex: 2032209" />
          <q-input v-model="shopeeConnectForm.partner_key" label="Live API Partner Key" outlined dense type="password"
            :rules="[val => !!val || 'Obrigatório']" hint="Começa com shpk..." />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn label="Conectar" unelevated color="deep-orange" icon="open_in_new"
            :loading="connectingShopee" @click="submitShopeeConnect" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Share Dialog -->
    <q-dialog v-model="shareDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <div class="dialog-header">
          <div class="header-icon" style="background: linear-gradient(135deg, #4f46e5, #818cf8)">
            <q-icon name="group" size="18px" />
          </div>
          <div>
            <div style="font-size: 15px; font-weight: 700; color: #1a1f36">Compartilhar Conta</div>
            <div style="font-size: 11px; color: #9aa0ac">{{ shareAccount?.account_nickname || shareAccount?.shop_name }}</div>
          </div>
        </div>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <!-- Usuários com acesso -->
          <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.5px">
            Acesso compartilhado
          </div>
          <div v-if="!shareAccount?.shared_with_users?.length" style="color:#9aa0ac; font-size:13px">
            Nenhum usuário com acesso compartilhado ainda.
          </div>
          <div v-for="u in (shareAccount?.shared_with_users || [])" :key="u.id"
            class="row items-center q-pa-xs" style="background:#f8fafc; border-radius:8px; margin-bottom:4px">
            <q-icon name="person" size="16px" color="indigo-5" class="q-mr-sm" />
            <div style="flex:1">
              <div style="font-size:13px; font-weight:600; color:#1a1f36">{{ u.username }}</div>
              <div style="font-size:11px; color:#9aa0ac">{{ u.email }}</div>
            </div>
            <q-btn flat round dense size="xs" color="negative" icon="close"
              :loading="removingShare === u.id"
              @click="removeShare(u.id)">
              <q-tooltip>Remover acesso</q-tooltip>
            </q-btn>
          </div>

          <q-separator class="q-my-sm" />

          <!-- Adicionar novo usuário -->
          <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.5px">
            Adicionar usuário
          </div>
          <div class="row q-gutter-sm items-center">
            <q-input v-model="shareEmail" label="E-mail do usuário" outlined dense style="flex:1"
              @keyup.enter="addShare" hint="Digite o e-mail e pressione Enter ou clique em Adicionar" />
            <q-btn unelevated color="indigo-5" label="Adicionar" size="sm"
              :loading="addingShare" @click="addShare" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Fechar" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Tiny Dialog -->
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
            Acesse <strong>Tiny ERP → Configurações → Aplicativos</strong> para obter as credenciais.
          </q-banner>
          <q-input v-model="tinyForm.client_id" label="Client ID" outlined dense
            :rules="[val => !!val || 'Obrigatório']" />
          <q-input v-model="tinyForm.client_secret" label="Client Secret" outlined dense type="password"
            :rules="[val => !!val || 'Obrigatório']" />
          <q-input :model-value="TINY_REDIRECT_URI" label="URL de Redirecionamento" outlined dense readonly
            hint="Use exatamente esta URL" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn label="Conectar" unelevated color="amber-8" icon="open_in_new" :loading="tinyConnecting"
            @click="submitTinySetup" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { DateTime } from 'luxon'
import { useStore } from 'src/stores/store'

const $q = useQuasar()
const authStore = useStore()
const currentUserId = computed(() => authStore.currentUser?.id)

// --- TABS ---
const activeTab = ref('ml')

// --- ML ---
const loadingML = ref(true)
const mlAccounts = ref([])
const isAuthenticating = ref(false)

// Contas ML com CNPJ definido mas sem Tiny conectado
const tinyDisconnectedAccounts = computed(() =>
  mlAccounts.value.filter(a => a.cnpj && !a.is_tiny_connected)
)
const deleteDialogML = ref(false)
const mlAccountToDelete = ref(null)

const ML_CLIENT_ID = '6026212895630598'
const isDevEnvironment = process.env.NODE_ENV === 'development'
const NGROK_URL = 'https://iodimetric-fiona-protandrously.ngrok-free.dev'
const ML_REDIRECT_URI = isDevEnvironment
  ? `${NGROK_URL}/ml-redirect?env=dev`
  : 'https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect?env=prod'

// --- Shopee ---
const loadingShopee = ref(false)
const shopeeAccounts = ref([])
const connectingShopee = ref(false)
const refreshingShopee = ref(null)
const syncingShopee = ref(null)
const deleteDialogShopee = ref(false)
const shopeeAccountToDelete = ref(null)
const shopeeConnectDialog = ref(false)
const shopeeConnectForm = ref({ partner_id: '', partner_key: '' })

const SHOPEE_REDIRECT_URI = isDevEnvironment
  ? `${NGROK_URL}/shopee-redirect`
  : 'https://sellerbot-frontend-367123809032.us-central1.run.app/shopee-redirect'

// --- Tiny ---
const tinyDialog = ref(false)
const tinyConnecting = ref(false)
const syncingCnpj = ref(null)
const TINY_REDIRECT_URI = isDevEnvironment
  ? `${NGROK_URL}/tiny/callback`
  : 'https://sellerbot-frontend-367123809032.us-central1.run.app/tiny/callback'

const tinyForm = ref({
  account_nickname: '',
  cnpj: '',
  client_id: '',
  client_secret: '',
})

// --- Colunas ML ---
const mlColumns = [
  { name: 'account_id', align: 'left', label: 'Seller ID', field: 'account_id' },
  { name: 'account_nickname', align: 'left', label: 'Nickname', field: 'account_nickname' },
  { name: 'cnpj', align: 'left', label: 'CNPJ', field: 'cnpj' },
  { name: 'access_token', align: 'left', label: 'Access Token', field: 'access_token' },
  { name: 'refresh_token', align: 'left', label: 'Refresh Token', field: 'refresh_token' },
  { name: 'is_connected', align: 'center', label: 'ML Status', field: 'is_connected' },
  { name: 'token_expires_at', align: 'left', label: 'Token Expira em', field: 'token_expires_at' },
  { name: 'flex_delivery_cost', align: 'center', label: 'Frete Flex (R$)', field: 'flex_delivery_cost' },
  { name: 'tiny_status', align: 'center', label: 'Tiny ERP', field: 'is_tiny_connected' },
  { name: 'actions', align: 'center', label: 'Ações', field: 'actions' },
]

// --- Colunas Shopee ---
const shopeeColumns = [
  { name: 'shop_name', align: 'left', label: 'Loja', field: 'shop_name' },
  { name: 'is_connected', align: 'center', label: 'Status', field: 'is_connected' },
  { name: 'direct_delivery_cost', align: 'center', label: 'Frete Entrega Direta (R$)', field: 'direct_delivery_cost' },
  { name: 'token_expires_at', align: 'left', label: 'Token Expira em', field: 'token_expires_at' },
  { name: 'actions', align: 'center', label: 'Ações', field: 'actions' },
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

// ==================== ML ====================

const getMLAccounts = async () => {
  loadingML.value = true
  try {
    const response = await api.get('/mercadolivre/accounts/')
    mlAccounts.value = response.data.results || response.data || []
  } catch (error) {
    console.error('Erro ao buscar contas ML:', error)
    mlAccounts.value = []
  } finally {
    loadingML.value = false
  }
}

const startMLAuth = () => {
  isAuthenticating.value = true
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}`
  window.location.href = authUrl
}

const handleAuthSuccess = async (code) => {
  try {
    loadingML.value = true
    const response = await api.post('/mercadolivre/auth/', { code, redirect_uri: ML_REDIRECT_URI })
    if (response.data?.success) {
      $q.notify({ message: 'Conta adicionada!', color: 'positive' })
      await getMLAccounts()
    }
  } catch (error) {
    console.error('Erro na autenticação:', error)
    $q.notify({ message: 'Erro na autenticação', color: 'negative' })
  } finally {
    loadingML.value = false
    isAuthenticating.value = false
  }
}

const confirmDeleteML = (account) => {
  mlAccountToDelete.value = account
  deleteDialogML.value = true
}

const deleteMLAccount = async () => {
  if (!mlAccountToDelete.value) return
  try {
    await api.delete(`/mercadolivre/accounts/${mlAccountToDelete.value.account_id}/`)
    $q.notify({ message: 'Conta excluída', color: 'positive' })
    await getMLAccounts()
  } catch (error) {
    $q.notify({ message: 'Erro ao excluir conta', color: 'negative' })
  } finally {
    deleteDialogML.value = false
    mlAccountToDelete.value = null
  }
}

// ==================== Shopee ====================

const getShopeeAccounts = async () => {
  loadingShopee.value = true
  try {
    const response = await api.get('/shopee/accounts/')
    shopeeAccounts.value = response.data.results || response.data || []
  } catch (error) {
    console.error('Erro ao buscar contas Shopee:', error)
    shopeeAccounts.value = []
  } finally {
    loadingShopee.value = false
  }
}

const connectShopee = () => {
  shopeeConnectForm.value = { partner_id: '', partner_key: '' }
  shopeeConnectDialog.value = true
}

const submitShopeeConnect = async () => {
  const { partner_id, partner_key } = shopeeConnectForm.value
  if (!partner_id || !partner_key) {
    $q.notify({ message: 'Preencha Partner ID e Partner Key.', color: 'warning', position: 'top' })
    return
  }
  connectingShopee.value = true
  try {
    const res = await api.get('/shopee/accounts/auth_url/', {
      params: { partner_id, partner_key }
    })
    sessionStorage.setItem('shopee_partner_id', partner_id)
    sessionStorage.setItem('shopee_partner_key', partner_key)
    shopeeConnectDialog.value = false
    window.location.href = res.data.auth_url
  } catch (error) {
    console.error('Erro ao gerar link Shopee:', error)
    $q.notify({ message: 'Erro ao gerar link de autorização.', color: 'negative', position: 'top' })
  } finally {
    connectingShopee.value = false
  }
}

const refreshShopeeToken = async (accountId) => {
  refreshingShopee.value = accountId
  try {
    await api.post(`/shopee/accounts/${accountId}/refresh_token/`)
    $q.notify({ message: 'Token renovado!', color: 'positive' })
    await getShopeeAccounts()
  } catch (error) {
    $q.notify({ message: 'Erro ao renovar token', color: 'negative' })
  } finally {
    refreshingShopee.value = null
  }
}

const syncShopeeOrders = async (accountId) => {
  syncingShopee.value = accountId
  try {
    await api.post(`/shopee/accounts/${accountId}/sync_orders/`)
    $q.notify({ message: 'Pedidos sincronizados!', color: 'positive' })
  } catch (error) {
    $q.notify({ message: 'Erro ao sincronizar pedidos', color: 'negative' })
  } finally {
    syncingShopee.value = null
  }
}

const syncShopeeItems = async (accountId) => {
  syncingShopee.value = accountId
  try {
    await api.post(`/shopee/accounts/${accountId}/sync_items/`)
    $q.notify({ message: 'Produtos sincronizados!', color: 'positive' })
  } catch (error) {
    $q.notify({ message: 'Erro ao sincronizar produtos', color: 'negative' })
  } finally {
    syncingShopee.value = null
  }
}

const confirmDeleteShopee = (account) => {
  shopeeAccountToDelete.value = account
  deleteDialogShopee.value = true
}

const deleteShopeeAccount = async () => {
  if (!shopeeAccountToDelete.value) return
  try {
    await api.delete(`/shopee/accounts/${shopeeAccountToDelete.value.id}/`)
    $q.notify({ message: 'Conta excluída', color: 'positive' })
    await getShopeeAccounts()
  } catch (error) {
    $q.notify({ message: 'Erro ao excluir conta', color: 'negative' })
  } finally {
    deleteDialogShopee.value = false
    shopeeAccountToDelete.value = null
  }
}

// ==================== Tiny ====================

const openTinySetup = async (account) => {
  if (!account.cnpj) {
    $q.notify({ message: 'Informe o CNPJ primeiro.', color: 'warning', position: 'top' })
    return
  }
  tinyForm.value = {
    account_nickname: account.account_nickname,
    cnpj: account.cnpj,
    client_id: '',
    client_secret: '',
  }
  // Pré-preenche credenciais se a conta Tiny já existir
  try {
    const { data } = await api.get('/api/erps/tiny/status/', { params: { cnpj: account.cnpj } })
    if (data.client_id)     tinyForm.value.client_id     = data.client_id
    if (data.client_secret) tinyForm.value.client_secret = data.client_secret
  } catch {
    // Conta Tiny ainda não existe — form fica em branco mesmo
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
    $q.notify({ message: 'Erro ao salvar frete Flex.', color: 'negative', position: 'top' })
  }
}

const saveDirectDeliveryCost = async (account, value) => {
  const cost = parseFloat(value)
  if (isNaN(cost) || cost < 0) {
    $q.notify({ message: 'Valor inválido.', color: 'warning', position: 'top' })
    return
  }
  try {
    await api.patch(`/shopee/accounts/${account.id}/settings/`, { direct_delivery_cost: cost })
    account.direct_delivery_cost = cost
    $q.notify({ message: 'Frete Entrega Direta atualizado!', color: 'positive', position: 'top', timeout: 2000 })
  } catch (error) {
    $q.notify({ message: 'Erro ao salvar frete Entrega Direta.', color: 'negative', position: 'top' })
  }
}

const saveCnpj = async (account, cnpj) => {
  const digits = (cnpj || '').replace(/\D/g, '')
  try {
    await api.patch(`/mercadolivre/accounts/${account.account_id}/cnpj/`, { cnpj: digits })
    account.cnpj = digits
    $q.notify({ message: 'CNPJ salvo!', color: 'positive', position: 'top', timeout: 2000 })
  } catch (error) {
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
      cnpj: tinyForm.value.cnpj,
      client_id: tinyForm.value.client_id,
      client_secret: tinyForm.value.client_secret,
      redirect_uri: TINY_REDIRECT_URI,
    })
    tinyDialog.value = false
    window.location.href = data.auth_url
  } catch (error) {
    console.error('Erro ao configurar Tiny:', error)
    $q.notify({ message: 'Erro ao configurar Tiny.', color: 'negative', position: 'top' })
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
      message: `Sync: ${data.synced} atualizados, ${data.skipped} sem SKU, ${data.errors} erros.`,
      color: data.errors > 0 ? 'warning' : 'positive',
      position: 'top', timeout: 5000,
    })
  } catch (error) {
    $q.notify({ message: 'Erro ao sincronizar produtos do Tiny.', color: 'negative', position: 'top' })
  } finally {
    syncingCnpj.value = null
  }
}

// ==================== Share ====================

const shareDialog = ref(false)
const shareAccount = ref(null)
const shareMarketplace = ref(null) // 'ml' | 'shopee'
const shareEmail = ref('')
const addingShare = ref(false)
const removingShare = ref(null)

const openShareDialog = (marketplace, account) => {
  shareMarketplace.value = marketplace
  shareAccount.value = { ...account }
  shareEmail.value = ''
  shareDialog.value = true
}

const addShare = async () => {
  if (!shareEmail.value.trim()) return
  addingShare.value = true
  try {
    const url = shareMarketplace.value === 'ml'
      ? `/mercadolivre/accounts/${shareAccount.value.account_id}/share/`
      : `/shopee/accounts/${shareAccount.value.id}/share/`
    await api.post(url, { email: shareEmail.value.trim() })
    shareEmail.value = ''
    $q.notify({ message: 'Acesso concedido!', color: 'positive', position: 'top', timeout: 2000 })
    // Recarrega os dados da conta para atualizar shared_with_users
    await refreshShareAccount()
  } catch (error) {
    const msg = error.response?.data?.error || 'Erro ao compartilhar.'
    $q.notify({ message: msg, color: 'negative', position: 'top' })
  } finally {
    addingShare.value = false
  }
}

const removeShare = async (userId) => {
  removingShare.value = userId
  try {
    const url = shareMarketplace.value === 'ml'
      ? `/mercadolivre/accounts/${shareAccount.value.account_id}/share/${userId}/`
      : `/shopee/accounts/${shareAccount.value.id}/share/${userId}/`
    await api.delete(url)
    $q.notify({ message: 'Acesso removido.', color: 'positive', position: 'top', timeout: 2000 })
    await refreshShareAccount()
  } catch (error) {
    $q.notify({ message: 'Erro ao remover acesso.', color: 'negative', position: 'top' })
  } finally {
    removingShare.value = null
  }
}

const refreshShareAccount = async () => {
  if (shareMarketplace.value === 'ml') {
    await getMLAccounts()
    const updated = mlAccounts.value.find(a => a.account_id === shareAccount.value.account_id)
    if (updated) shareAccount.value = { ...updated }
  } else {
    await getShopeeAccounts()
    const updated = shopeeAccounts.value.find(a => a.id === shareAccount.value.id)
    if (updated) shareAccount.value = { ...updated }
  }
}

// ==================== Lifecycle ====================

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)

  // ML OAuth callback
  const code = urlParams.get('code')
  if (code) {
    handleAuthSuccess(code)
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  // Abrir aba correta se vier via ?tab=shopee
  const tab = urlParams.get('tab')
  if (tab === 'shopee') {
    activeTab.value = 'shopee'
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  getMLAccounts()
  getShopeeAccounts()
})
</script>

<style scoped>
.accounts-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 16px;
  background: #fff;
  border-bottom: 1.5px solid #e8edf3;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d9488, #2dd4bf);
  color: #fff;
}

.header-eyebrow {
  font-size: 10px;
  color: #9aa0ac;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1f36;
}

/* Tabs */
.tabs-container {
  background: #fff;
  border-bottom: 1.5px solid #e8edf3;
  padding: 0 24px;
}

.tabs-wrap {
  display: flex;
  gap: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  transition: color .15s, border-color .15s;
}

.tab-btn:hover {
  color: #1a1f36;
}

.tab-btn--active {
  color: #1a1f36;
  font-weight: 600;
  border-bottom-color: #0d9488;
}

.tab-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
}

.tab-shopee-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #EE4D2D;
  color: #fff;
  font-size: 7px;
  font-weight: 900;
  border-radius: 4px;
  padding: 1px 4px;
  letter-spacing: .04em;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #e8edf3;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.tab-btn--active .tab-count {
  background: #d1fae5;
  color: #059669;
}

/* Content */
.content-wrap {
  padding: 20px 24px;
}

.tab-content {
  animation: fadeIn .2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tab-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1f36;
}

.table-wrap {
  background: #fff;
  border-radius: 10px;
  border: 1.5px solid #e8edf3;
  overflow: hidden;
}

.accounts-table {
  background: transparent;
}

.th-cell {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #9aa0ac;
}

.td-val {
  color: #1a1f36;
  font-size: 13px;
}

.td-empty {
  color: #9aa0ac;
  font-style: italic;
  font-size: 13px;
}

.td-muted {
  color: #9aa0ac;
  font-size: 12px;
}

.token-preview {
  font-family: monospace;
  font-size: 12px;
  color: #9aa0ac;
}

.shopee-name {
  font-weight: 600;
  color: #1a1f36;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  padding: 2px 10px;
}

.status-chip--pos {
  background: #dcfce7;
  color: #16a34a;
}

.status-chip--neg {
  background: #fef2f2;
  color: #ef4444;
}

.status-chip--neutral {
  background: #f3f4f6;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.shopee-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: rgba(238, 77, 45, .1);
  margin-bottom: 8px;
}

.shopee-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #EE4D2D;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  border-radius: 6px;
  padding: 4px 8px;
  letter-spacing: .04em;
}

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .accounts-list { padding: 0 12px; }
  .content-area { padding: 12px; }
}
</style>
